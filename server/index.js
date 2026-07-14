// ============================================================
// Photo Sorter — production static server
//
// A tiny, hardened Node/Express server that serves the pre-built
// single-page app (dist/). It replaces the previous nginx layer so the
// whole deployment is a single container driven by `docker compose`.
//
// Security posture (see docs/SECURITY.md):
//   - `helmet` sets a strict Content-Security-Policy + the full set of
//     security headers (HSTS, X-Content-Type-Options, X-Frame-Options, …).
//   - Cross-origin isolation (COOP + COEP + CORP) is enabled so the WASM
//     decoders can use SharedArrayBuffer and the tab is process-isolated.
//   - Only GET/HEAD are accepted; there is no body parsing, no cookies,
//     no upstream calls — the attack surface is deliberately minimal.
//   - Hashed build assets are cached immutably; HTML / service worker /
//     manifest always revalidate so PWA updates ship immediately.
// ============================================================

import express from "express"
import helmet from "helmet"
import compression from "compression"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Directory holding the compiled SPA. In the Docker image the built assets
// are copied next to this file (./public); locally it points at ../dist.
const DIST_DIR = process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : path.resolve(__dirname, "public")

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10)
const HOST = process.env.HOST ?? "0.0.0.0"
// Only enable when running behind a trusted TLS-terminating reverse proxy /
// load balancer, so HSTS + protocol detection reflect the external scheme.
// Env vars are strings, so treat "false"/"0"/"" as OFF (a plain truthiness
// check would wrongly enable trust for the string "false"). Any other value
// (e.g. "1", "true", "loopback", an IP/subnet list) is passed to Express as-is.
const trustProxyEnv = process.env.TRUST_PROXY
const TRUST_PROXY = trustProxyEnv && trustProxyEnv !== "false" && trustProxyEnv !== "0" ? trustProxyEnv : false

const app = express()

app.disable("x-powered-by")
app.set("etag", "strong")
if (TRUST_PROXY) app.set("trust proxy", TRUST_PROXY)

// ------------------------------------------------------------
// Security headers — helmet with an explicit, app-specific CSP.
// `useDefaults: false` means every directive below is intentional; nothing
// is inherited implicitly. The policy allows: same-origin everything, WASM
// compilation (`wasm-unsafe-eval`), blob:/data: for locally generated
// previews, and inline styles (required by Tailwind/Radix runtime styles).
// It forbids: any remote script/connect/frame, plugins, and framing.
// ------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        imgSrc: ["'self'", "blob:", "data:"],
        mediaSrc: ["'self'", "blob:"],
        fontSrc: ["'self'", "data:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
        workerSrc: ["'self'", "blob:"],
        connectSrc: ["'self'", "blob:", "data:"],
        manifestSrc: ["'self'"],
        upgradeInsecureRequests: []
      }
    },
    // Cross-origin isolation: process-isolate the tab and unlock
    // SharedArrayBuffer for the libraw/mediainfo WASM workers.
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginEmbedderPolicy: { policy: "require-corp" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    // 2 years, subdomains, preload-eligible. Only honoured over HTTPS.
    strictTransportSecurity: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: "no-referrer" },
    frameguard: { action: "deny" }
    // X-Content-Type-Options, X-DNS-Prefetch-Control, Origin-Agent-Cluster,
    // X-Download-Options and X-Permitted-Cross-Domain-Policies keep helmet's
    // secure defaults.
  })
)

// Permissions-Policy isn't managed by helmet — deny every powerful feature
// the app never uses; only same-origin fullscreen / picture-in-picture (media
// viewer) are allowed.
const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "browsing-topics=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "interest-cohort=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "picture-in-picture=(self)",
  "publickey-credentials-get=()",
  "screen-wake-lock=()",
  "serial=()",
  "sync-xhr=()",
  "usb=()",
  "xr-spatial-tracking=()"
].join(", ")

app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", PERMISSIONS_POLICY)
  next()
})

// Reject anything that isn't a read. The server exposes no mutating routes,
// so this closes the door on unexpected verbs up front.
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.set("Allow", "GET, HEAD")
    return res.status(405).type("text/plain").send("Method Not Allowed")
  }
  next()
})

app.use(compression())

// Liveness/readiness probe for Docker/orchestrators.
app.get("/healthz", (_req, res) => {
  res.type("text/plain").send("ok")
})

// ------------------------------------------------------------
// Static assets
// ------------------------------------------------------------
app.use(
  express.static(DIST_DIR, {
    index: false,
    // Serve /.well-known/security.txt; dist is our own build output.
    dotfiles: "allow",
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".wasm")) {
        res.setHeader("Content-Type", "application/wasm")
      } else if (filePath.endsWith(".webmanifest")) {
        res.setHeader("Content-Type", "application/manifest+json; charset=utf-8")
      }

      if (/[/\\]assets[/\\]/.test(filePath)) {
        // Content-hashed → safe to cache forever.
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
      } else {
        // HTML, service worker, manifest, icons → always revalidate.
        res.setHeader("Cache-Control", "no-cache")
      }
    }
  })
)

// ------------------------------------------------------------
// SPA fallback: an unknown *navigation* path returns index.html; the client
// then normalizes the URL back to "/" (single-view app, no routes). A missing
// static asset (anything with a file extension, or under /assets/) returns a
// real 404 so the browser never parses index.html as JS/CSS/WASM.
// ------------------------------------------------------------
app.use((req, res) => {
  const looksLikeAsset = req.path.startsWith("/assets/") || /\.[a-zA-Z0-9]+$/.test(req.path)
  if (looksLikeAsset) {
    return res.status(404).type("text/plain").send("Not Found")
  }
  res.setHeader("Cache-Control", "no-cache")
  res.sendFile(path.join(DIST_DIR, "index.html"), err => {
    if (err) res.status(404).type("text/plain").send("Not Found")
  })
})

const server = app.listen(PORT, HOST, () => {
  console.log(`[photo-sorter] serving ${DIST_DIR} on http://${HOST}:${PORT}`)
})

// Graceful shutdown so `docker stop` / orchestrator SIGTERM drains cleanly.
const shutdown = signal => {
  console.log(`[photo-sorter] ${signal} received, shutting down`)
  server.close(() => process.exit(0))
  // Force-exit if connections don't drain in time.
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
