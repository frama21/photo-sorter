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
- **Undo** the last sort (`Ctrl/Cmd+Z`), with full copy/move reversal.
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
| `Ctrl/Cmd + Z` | Undo last sort              |

(Shortcuts are ignored while typing in a text field.)

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/Radix UI · Zustand ·
ExifReader · mediainfo.js · libraw-wasm · vite-plugin-pwa.

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

A multi-stage `Dockerfile` builds the app with pnpm and serves the static output
with nginx (SPA routing, security headers, caching and PWA/WASM MIME types
included). The final image ships only the built assets — no Node or toolchain.

```bash
docker compose up -d --build    # build & run → http://localhost:8080
docker compose down             # stop
```

Or without Compose:

```bash
docker build -t photo-sorter .
docker run -d -p 8080:80 photo-sorter
```

## How state is stored

A single JSON file, `photo-sorter-db.json`, is written to the folder you open.
It contains the sort folders, the per-file sort mapping (keyed by file name),
the move mode, the recent operation log, and a metadata cache. Deleting this
file resets the project; the app recreates it on the next open. The database
carries a schema version and is reset (with a visible warning) if an
incompatible version is found.

## Security

- All files are processed **locally** in the browser; nothing is uploaded.
- A strict **Content-Security-Policy** and a set of security headers
  (`COOP`/`COEP`, `HSTS`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, …) are applied at the hosting layer — see
  [`docker/nginx.conf`](docker/nginx.conf) / [`docker/security-headers.conf`](docker/security-headers.conf)
  for the Docker deployment.
- The app is a single view: any unknown URL is normalized back to `/`.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the release history.