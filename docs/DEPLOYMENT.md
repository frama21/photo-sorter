# Deployment Guide

How to build, run, and host Photo Sorter. Two first-class targets are supported — a **single hardened Docker container** and **Firebase Hosting** — and both ship the **same** strict security headers.

Version 2.0.1 · Last updated 2026-07-14 · Status: Living document

> **Guiding principles.** This guide and the codebase follow six code principles — **Clean Code**, **YAGNI**, **DRY**, **KISS**, **Semantic** naming/HTML, and **A11y**. In deployment they show up as a deliberately minimal, single-purpose runtime (KISS/YAGNI), one canonical security-header definition mirrored across targets (DRY), and readable, self-documenting config. Full definitions: **[PRINCIPLES.md](PRINCIPLES.md)**.

---

## 1. Overview

Photo Sorter is a static single-page app: the build output in `dist/` is just HTML, JS, CSS, and WASM. The only job of a deployment is to serve those files **with the right security headers and MIME types** and route unknown paths back to `index.html`.

There is **no nginx and no reverse proxy** in the stack. Pick one target:

| Target | Best for | Entry point |
| --- | --- | --- |
| **Docker Compose** (recommended) | Self-hosting, homelab, VPS, any container platform | [`docker-compose.yml`](../docker-compose.yml) + [`Dockerfile`](../Dockerfile) + [`server/index.js`](../server/index.js) |
| **Firebase Hosting** | Zero-ops managed HTTPS + CDN | [`firebase.json`](../firebase.json) + [`.firebaserc`](../.firebaserc) |

Both targets apply the identical header set documented in [SECURITY.md](SECURITY.md) §4.

---

## 2. Prerequisites

- **Build:** Node 22+ and pnpm 9 (`corepack enable && corepack prepare pnpm@9.15.9 --activate`).
- **Docker target:** Docker Engine + Compose v2.
- **Firebase target:** the Firebase CLI (`npm i -g firebase-tools`) and access to the Firebase project in [`.firebaserc`](../.firebaserc).

---

## 3. Option A — Docker Compose (recommended)

```bash
docker compose up -d --build    # build image + run → http://localhost:8080
docker compose logs -f          # follow logs
docker compose down             # stop & remove
```

### What the image is

A three-stage [`Dockerfile`](../Dockerfile):

1. **build** (`node:22-slim`) — `pnpm install --frozen-lockfile` then `pnpm build` → `dist/`.
2. **server-deps** (`node:22-alpine`) — `npm ci --omit=dev` of only `express`, `helmet`, `compression` from the committed `server/package-lock.json`.
3. **runtime** (`node:22-alpine`) — copies `server/index.js` + audited `node_modules` + `dist` (as `./public`). Runs as the unprivileged built-in **`node`** user. No toolchain, no frontend deps, no shell utilities.

The final image serves the app with [`server/index.js`](../server/index.js) (Express + helmet) — see §5.

### Compose hardening

[`docker-compose.yml`](../docker-compose.yml) is production-ready by default:

| Setting | Effect |
| --- | --- |
| `read_only: true` + `tmpfs: /tmp` | Immutable root filesystem; only `/tmp` is writable. |
| `security_opt: [no-new-privileges:true]` | Blocks setuid privilege escalation. |
| `cap_drop: [ALL]` | No Linux capabilities (none are needed to bind :8080 as non-root). |
| `init: true` | tini as PID 1 — reaps zombies, forwards signals. |
| `deploy.resources.limits` | 1 CPU / 256 MB (reservation 64 MB). |
| `logging` | json-file, rotated at `10m × 3`. |
| `healthcheck` + `restart: unless-stopped` | Self-healing via the `/healthz` probe. |

### Updating

```bash
git pull
docker compose up -d --build    # rebuild picks up dependency patches
```

---

## 4. Option B — Docker without Compose

```bash
docker build -t photo-sorter .
docker run -d -p 8080:8080 --name photo-sorter \
  --read-only --tmpfs /tmp --cap-drop ALL \
  --security-opt no-new-privileges \
  photo-sorter
```

---

## 5. The static server (`server/index.js`)

A ~180-line Express 5 + helmet 8 + compression server. Behavior:

- Sets the strict CSP + full security-header set and enables cross-origin isolation (COOP + COEP + CORP).
- Accepts **`GET`/`HEAD` only** (`405` otherwise); no body parsing, no cookies, no upstream calls.
- Serves hashed `/assets/*` with `immutable` caching; HTML / `sw.js` / `manifest.webmanifest` with `no-cache`.
- Emits correct `application/wasm` and `application/manifest+json` MIME types.
- Serves `/.well-known/security.txt`; exposes `/healthz`.
- SPA fallback: unknown *navigation* paths → `index.html`; missing *assets* → real `404`.
- Compresses responses (gzip/brotli) and shuts down gracefully on `SIGTERM`/`SIGINT`.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | Listen port. |
| `HOST` | `0.0.0.0` | Bind address. |
| `STATIC_DIR` | `./public` | Directory of built assets (points at `../dist` when run from source). |
| `TRUST_PROXY` | `false` | Set to `1` **only** behind a trusted TLS-terminating proxy so protocol detection + HSTS reflect the external scheme. |

Run locally against a fresh build:

```bash
pnpm build
cd server && npm install --omit=dev
STATIC_DIR=../dist PORT=8080 node index.js
```

---

## 6. Option C — Firebase Hosting

[`firebase.json`](../firebase.json) mirrors the container's security headers (CSP, COOP/COEP/CORP, HSTS, Referrer-Policy, X-Frame-Options, Permissions-Policy, …), sets immutable caching for `/assets/**`, `no-cache` for `index.html` / `sw.js` / `manifest.webmanifest`, and rewrites unknown paths to `/index.html`. Because Firebase serves over HTTPS, **HSTS is actually effective there**.

```bash
pnpm build                 # produce dist/
firebase deploy --only hosting
```

Notes:

- The `ignore` list intentionally does **not** exclude dotfiles, so `dist/.well-known/security.txt` is deployed.
- [`.firebaserc`](../.firebaserc) only maps the project alias (`default` → the Firebase project); it holds **no security configuration** — all hosting security lives in `firebase.json`.
- `firebase.json` and `.firebaserc` are version-controlled (like the `Dockerfile`) because they carry the production security posture.

---

## 7. TLS / HTTPS

- **Firebase Hosting** provides managed HTTPS automatically.
- **Container:** it speaks plain HTTP; terminate TLS at your platform edge (Cloudflare, a cloud load balancer, or an existing Caddy/Traefik) and forward to `:8080`, setting `TRUST_PROXY=1`. HSTS is inert over plain HTTP by design.
- Consider the [HSTS preload list](https://hstspreload.org/) once you serve a stable HTTPS domain.

---

## 8. Verification

```bash
# Container
docker compose up -d --build
curl -sSD - http://localhost:8080/ -o /dev/null   # inspect headers
curl -s http://localhost:8080/healthz             # → ok

# Expect: CSP + COOP/COEP + HSTS + Permissions-Policy present;
# /assets/* → immutable; POST / → 405; missing /assets/x.js → 404.
```

See [SECURITY.md](SECURITY.md) §7 for the full verification checklist.

---

## 9. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `SharedArrayBuffer is not defined` | Cross-origin isolation missing — ensure COOP `same-origin` + COEP `require-corp` reach the browser (both targets set them; a proxy must not strip them). |
| HSTS not applied | HSTS is only honoured over HTTPS; terminate TLS in front of the container. |
| Video metadata blank | Known functional limitation: `MediaInfoModule.wasm` is not emitted at build time, so video metadata degrades gracefully. Not a security issue — see [SECURITY.md](SECURITY.md) §8. |
| Static asset returns `index.html` | Should not happen — the server returns `404` for missing assets. Verify you built with `pnpm build` and the asset exists in `dist/`. |

---

## 10. Related documents

- [ARCHITECTURE.md](ARCHITECTURE.md) — where the deployment fits in the system.
- [SECURITY.md](SECURITY.md) — the authoritative security-header and hardening reference.
- [TDD.md](TDD.md) — server + container technical design.
- [README](../README.md) — quick-start.
