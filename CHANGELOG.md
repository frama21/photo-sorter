# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Security

- Full security audit ([docs/SECURITY.md](docs/SECURITY.md)); dependency tree is
  now audit-clean (`pnpm audit` → no known vulnerabilities, prod and dev).
- Patched `exifreader` (`^4.38.1` → `^4.41.0`) — fixes two DoS advisories in the
  EXIF parser that runs on untrusted images.
- Moved the `shadcn` CLI to `devDependencies`, removing a large server-side
  dependency tree (hono/qs/js-yaml/babel/MCP SDK) from the production graph;
  pinned remaining dev-only transitive advisories via `pnpm.overrides`.
- Hardened the project-database load path against prototype pollution and
  unbounded memory (null-prototype maps, dangerous-key stripping, size caps).
- Stricter folder-name validation (control chars, `.`/`..`, reserved device
  names, trailing dot/space, length cap).
- Added `/.well-known/security.txt` (RFC 9116).
- Added a hardened [`firebase.json`](firebase.json) with the same full security
  header set (CSP, COOP/COEP/CORP, HSTS, Permissions-Policy, …) for the Firebase
  Hosting deployment target; `firebase.json`/`.firebaserc` are now
  version-controlled like the `Dockerfile`.

### Changed

- **Deployment no longer uses nginx.** The app is served by a single hardened
  `node:22-alpine` container running an Express + helmet static server
  (`server/index.js`) as a non-root user: strict CSP, cross-origin isolation,
  correct WASM/manifest MIME, immutable asset caching, `GET`/`HEAD` only, and a
  `/healthz` probe.
- `docker-compose.yml` hardened: read-only root filesystem, `no-new-privileges`,
  all capabilities dropped, resource limits, log rotation, and `init: true`.

### Code quality

- Adopted the code principles **Clean Code, YAGNI, DRY, KISS, Semantic, and
  A11y** across the codebase (documented in [docs/PRINCIPLES.md](docs/PRINCIPLES.md)).
- DRY refactors: a single `mutateDatabase()` read-modify-write helper behind the
  four DB writers, and a shared `megapixelsFrom()` used by the image and video
  metadata paths.
- Accessibility: restored user zoom (removed `maximum-scale`/`user-scalable=no`,
  per WCAG 1.4.4/1.4.10) and added a `role="status"`/`aria-live` region for
  status toasts.
- Fixed the empty-state hint to show the correct database filename
  (`photo-sorter-db.json`).
- Added **Prettier** (`pnpm format` / `pnpm format:check`, config in
  `.prettierrc`) and formatted the whole codebase.
- Full-codebase principle audit and cleanup:
  - **A11y**: fixed a broken folder-name `label`/`for` association, named the
    add-folder and progress-bar controls, made the folder logo decorative, and
    enabled Enter-to-submit for adding folders.
  - **Semantic**: removed invalid `<div>`-inside-`<p>` nesting in FolderManager
    and OperationLog; `ThemeProvider` now uses an `undefined` context default so
    the "used outside provider" guard is meaningful.
  - **Dead code / YAGNI**: removed the unused `removeStatus` store action,
    `isInitializedRef`, the write-only `PhotoFile.moved` field, speculative
    exports (`loadProjectState`, `ALL_EXTENSIONS`, …), and the now-unused
    `lodash.isempty` dependency.
  - **DRY/KISS**: extracted `StatRow` and a `getExtension` helper, consolidated
    MobileActionBar's duplicate index prop, and simplified trivial `useMemo`/
    `isEmpty` usages.
  - **Correctness**: fixed the `TRUST_PROXY` env parsing (`"false"` no longer
    enabled it), a `formatFileSize` out-of-bounds for ≥ 1 PB, an edge-swipe
    `touchStart === 0` guard, and dead `dark-*` utility classes that left the
    mobile bar with no background.

### Added

- Detailed project documentation under [`docs/`](docs/): PRD, SPEC,
  ARCHITECTURE, DESIGN, TDD, UI-Design, PRINCIPLES, DEPLOYMENT, and SECURITY.

## [2.0.1] - 2026-06-14

### Fixed

- RAW preview no longer hangs on libraw worker errors ("n is not a function").
- Truncated/broken Sony ARW previews — the embedded JPEG is now extracted
  correctly (slice SOI→next-SOI and let the decoder find the EOI).

### Changed

- Patch the libraw-wasm worker (reject on error) + 20s timeout + terminate the
  worker after each decode.
- Fall back to libraw `thumbnailData()` for RAW without an embedded JPEG.
- Re-encode previews to a bounded JPEG so cached previews aren't tens of MB.
- Bump libraw-wasm to ^1.4.0.

## [2.0.0] - 2026-06-14

> ⚠️ **Breaking:** database schema bumped to `2.0`; existing
> `photo-sorter-db.json` files are reset on first open.

### Added

- Chronological ordering by capture date.
- Undo last sort (`Ctrl/Cmd+Z`) and jump to next unsorted (`U`).
- "All sorted" completion state.
- Installable PWA with offline support.
- Lazy, cached metadata extraction.
- Automatic image-preview retry on load failure.
- Filename-collision handling (no silent overwrites).
- Security headers + CSP and client-side URL normalization.
- Docker support (multi-stage build + nginx).
- React error boundary.

### Changed

- Sort mappings keyed by file name instead of array index.
- Operation log is now fully serializable; database writes are atomic.
- RAW preview uses the largest embedded JPEG (libraw fallback).
- Broader metadata extraction and robust date parsing.
- Responsive metadata panel; mobile bar shows all folders.
- New page title and rewritten README; removed template assets and dead code.

### Fixed

- Sort state desync after cut + reload.
- Stale file handle and invalid source-delete path on cut.
- RAW decodes retrying forever; unrevoked object URLs (memory leak).
- Shortcuts firing while typing; first photo unsortable on mobile.
- `formatDate` on non-standard date strings; status-toast timing race.
- `removeFolder` leaving non-empty folders; duplicate/invalid folder names.
- Camera make/model duplication; broken HEIC and favicon references.

## [1.1.0] - 2025-05

### Added

- Video preview and video metadata (mediainfo.js).

### Changed

- Migrated to shadcn/Radix components and a Zustand status store.

### Fixed

- Database no longer reset when reloading the project folder.
