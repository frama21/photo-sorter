# Photo Sorter

A fast, **100% client-side** photo & video sorter that runs in the browser. Open
a local folder, preview each file, and copy/move it into sort sub-folders with
single-key shortcuts. Nothing is uploaded — all processing happens locally via
the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API).

> Requires a Chromium-based browser (Chrome / Edge / Opera). The File System
> Access API is not available in Firefox/Safari.

## Features

- **Open a local folder** and scan top-level images & videos — nothing leaves
  your machine.
- **Chronological order** — files are sorted by capture date/time (EXIF / video
  metadata), falling back to the file's modified date.
- **Sort with shortcuts** — keys `1`–`9` assign the current file to a folder.
- **Copy or Cut mode** — duplicate into the target folder, or move it there.
- **Filmstrip & grid view** — a thumbnail strip under the viewer and a
  toggleable responsive grid (with RAW previews), both showing sort status.
- **Zoom & pan** — a desktop hover **loupe** magnifier, plus pinch-to-zoom /
  drag-to-pan and double-tap-to-reset on touch, for pixel-peeping.
- **Multi-select + batch sort** — select many photos (checkbox, shift-range,
  "pilih belum disortir") and sort them all into a folder at once — via the
  folder button or its number shortcut; a batch is a single undo.
- **Undo** the last action (`Ctrl/Cmd+Z`), covering single and batch sorts.
- **Jump to next unsorted** (`U`) to skip already-sorted files, plus an
  "all sorted" completion state.
- **Wide format support** — JPEG/PNG/WebP/AVIF/GIF/BMP/TIFF, SVG, plus RAW
  (Canon, Nikon, Sony, Fuji, Panasonic, Olympus, Pentax, DNG, …) and video
  (MP4, MOV, MKV, WebM, AVI, …).
- **RAW preview** — extracts the largest embedded JPEG preview (sharp & fast),
  with a full-resolution `libraw-wasm` decode as fallback.
- **Metadata panel** — EXIF for images (camera, lens, ISO, shutter, aperture,
  date) and `mediainfo.js` for video (duration, fps, codecs, bitrate). Metadata
  is extracted lazily on demand and cached.
- **Auto-persisted project state** — folders, sort mappings, mode, and the
  recent operation log are saved to `photo-sorter-db.json` inside the chosen
  folder and restored on the next visit.
- **Filename-collision safe** — copies/moves never silently overwrite; a
  `_1`, `_2`, … suffix is added when a name already exists.
- **Installable PWA** — install to your desktop/home screen and keep working
  offline thanks to a precaching service worker.
- **Responsive** — desktop sidebar layout and a mobile action bar with swipe
  navigation. Light/dark themes.

## Keyboard shortcuts

| Key            | Action                      |
| -------------- | --------------------------- |
| `1`–`9`        | Sort into folder 1–9        |
| `←` / `→`      | Previous / next photo       |
| `Space`        | Next photo                  |
| `U`            | Jump to next unsorted photo |
| `Ctrl/Cmd + Z` | Undo last action            |

(Shortcuts are ignored while typing in a text field.)

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/Radix UI · Zustand ·
ExifReader · mediainfo.js · libraw-wasm · vite-plugin-pwa. Production server:
Express + helmet (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).

## Getting started

Requires Node 22+ and pnpm.

```bash
pnpm install
pnpm dev        # start the dev server
pnpm build      # typecheck + production build
pnpm preview    # preview the production build
pnpm lint       # run ESLint
```

## Run with Docker

Deployment is a **single container** driven by `docker compose` — **no nginx and
no reverse proxy**. A multi-stage `Dockerfile` builds the app with pnpm, then a
minimal `node:22-alpine` runtime serves the static output with a tiny hardened
[Express](https://expressjs.com/) + [helmet](https://helmetjs.github.io/) server
([`server/index.js`](server/index.js)): strict CSP + security headers,
cross-origin isolation, SPA routing, immutable asset caching, and correct
PWA/WASM MIME types. The final image contains only the built assets and three
audited server dependencies — no toolchain, and it runs as a **non-root** user.

```bash
docker compose up -d --build    # build & run → http://localhost:8080
docker compose down             # stop
```

The Compose file is hardened for production out of the box: read-only root
filesystem, `no-new-privileges`, all Linux capabilities dropped, resource
limits, log rotation, and a health check. For public HTTPS, terminate TLS at
your platform edge (Cloudflare, a load balancer, Caddy/Traefik) and forward to
the container, setting `TRUST_PROXY=1`. See [docs/SECURITY.md](docs/SECURITY.md)
for the full deployment hardening details.

Or without Compose:

```bash
docker build -t photo-sorter .
docker run -d -p 8080:8080 photo-sorter
```

## How state is stored

A single JSON file, `photo-sorter-db.json`, is written to the folder you open.
It contains the sort folders, the per-file sort mapping (keyed by file name),
the move mode, the recent operation log, and a metadata cache. Deleting this
file resets the project; the app recreates it on the next open. The database
carries a schema version and is reset (with a visible warning) if an
incompatible version is found.

## Security

- All files are processed **locally** in the browser; nothing is uploaded and
  there is no network egress (`connect-src 'self'`).
- A strict **Content-Security-Policy** and a full set of security headers
  (`COOP`/`COEP`/`CORP` cross-origin isolation, `HSTS`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, …) are set by the hardened
  [`server/index.js`](server/index.js).
- Untrusted input is defended in depth: images are parsed header-only and
  decodes are bounded/timed-out; the project database is sanitized against
  prototype pollution; folder names are strictly validated.
- The dependency tree is **audit-clean** (`pnpm audit` → *No known
  vulnerabilities found*), and the production image ships only three audited
  server dependencies.
- The app is a single view: any unknown URL is normalized back to `/`.

A full security policy, threat model, and audit report is in
[docs/SECURITY.md](docs/SECURITY.md). Report vulnerabilities privately via
[GitHub security advisories](https://github.com/frama21/photo-sorter/security/advisories/new)
(see [`/.well-known/security.txt`](public/.well-known/security.txt)).

## Documentation

Detailed project documentation lives in [`docs/`](docs/):

| Document | Purpose |
| --- | --- |
| [PRD.md](docs/PRD.md) | Product requirements — vision, personas, user stories, scope. |
| [SPEC.md](docs/SPEC.md) | Functional specification — features, formats, behaviors, edge cases. |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture — modules, data flow, deployment. |
| [DESIGN.md](docs/DESIGN.md) | Software design — key decisions, rationale, core algorithms. |
| [TDD.md](docs/TDD.md) | Technical design — module internals, DB schema, sequence diagrams, limits. |
| [UI-Design.md](docs/UI-Design.md) | UI/UX — design tokens, layout, components, theming, accessibility. |
| [PRINCIPLES.md](docs/PRINCIPLES.md) | Engineering & product principles (Clean Code · YAGNI · DRY · KISS · Semantic · A11y). |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment guide — Docker Compose, the server, and Firebase Hosting. |
| [SECURITY.md](docs/SECURITY.md) | Security policy, threat model, and audit report. |

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the release history.