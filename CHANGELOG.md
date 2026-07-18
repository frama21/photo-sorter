# Changelog

All notable changes to this project are documented in this file.

## [2.3.0] - 2026-07-19

> Rebranded from **Photo Sorter** to **Nata Photo**. The on-disk state file is now
> `nata-photo-db.json`; existing `photo-sorter-db.json` projects are read as a
> fallback and re-saved under the new name, so no sort progress is lost.

### Added

- **Internationalization (English + Indonesian).** The whole UI is now bilingual
  via **i18next / react-i18next**, with a navbar language toggle. English is the
  default; the choice persists to `localStorage` (`lumen-storage`) and `<html lang>`
  follows it. Strings live one-file-per-language in
  `src/shared/i18n/language/{en,id}.json`; a module-level `t()` also localizes
  non-React code (services, the class error boundary).
- **Customizable folder sort-shortcuts.** Click a folder's badge and press a key
  to set its shortcut. Any key is accepted except reserved app actions (arrows,
  `Space`, `U`, `Esc`), modifier combinations (e.g. `Ctrl+P`), and keys already
  used by another folder — validated in `shared/lib/shortcut.ts`. Folders beyond
  the first nine can now be bound too.
- **Tooltips on every icon-only control** via a new shadcn `Tooltip` component
  and `WithTooltip` wrapper (`shared/ui/tooltip.tsx`), each localized.
- **`pages/` presentation layer** — the app shell now routes between a `welcome`
  and an `editor` page instead of one monolithic `App.tsx`.

### Changed

- **Project restructured to Feature-Sliced Design** — `src/{app,pages,features,shared}`
  with a one-way dependency rule and a public-API `index.ts` barrel per slice, for
  readability, scalability, and easy handover. See
  [docs/ARCHITECTURE.md §3](docs/ARCHITECTURE.md).
- **UI/UX design revamp** — a distinctive "darkroom" identity: warm amber accent
  over warm-tinted OKLCH neutrals, a three-family type system (Bricolage Grotesque
  / Inter / JetBrains Mono), an ambient background, high-impact motion and
  **skeleton-shimmer** loaders (all respecting `prefers-reduced-motion`), and a
  stat-tile treatment across the sidebar panels.
- Metadata extraction, RAW decoding, and the controller hook moved to
  `shared/services/*` and `features/file-system/model/*` (behavior unchanged).

### Fixed

- **RAW dimensions & megapixels now read correctly.** EXIF exposed only the
  embedded thumbnail's size for RAW files (e.g. a Nikon NEF reported 160×120); the
  true sensor dimensions are now read from the largest embedded JPEG preview
  (worker-free, so it never contends with an in-flight RAW decode). Verified: a
  Nikon D3100 NEF now reports 4608×3072 / 14.2 MP.

### Principles

- Adopted the **longevity principles** — Readable · Understandable · Reusable ·
  Scalable · Maintainable · Easy to Hand Over — realized through the FSD structure,
  documented in [docs/PRINCIPLES.md](docs/PRINCIPLES.md).

## [2.2.0] - 2026-07-15

### Added

- Grid view lazily renders thumbnails and appends more on scroll (with a
  loader), keeping folders of thousands of photos light.
- Grid keyboard shortcuts: `Ctrl/Cmd+A` toggles select-all, `Shift+Click`
  toggles a selection range, and `Esc` clears the selection.

### Changed

- The filmstrip and grid now scroll inside a shadcn `ScrollArea`.

## [2.1.0] - 2026-07-14

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
  (`nata-photo-db.json`).
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

- **Filmstrip & grid view.** A scrollable thumbnail filmstrip under the viewer
  and a toggleable responsive grid for overview — both show sort status and the
  current photo, and lazily decode small **RAW previews** in the background.
- **Zoom & pan.** A desktop hover **loupe** magnifier over the image, plus
  pinch-to-zoom / drag-to-pan and double-tap-to-reset on touch.
- **Multi-select + batch sort.** Select photos (checkbox, shift-click range,
  "pilih belum disortir") and sort the whole selection into a folder at once —
  from the contextual bottom bar, the sidebar's Sortir button, or a folder's
  number shortcut; a batch is a single undoable unit.
- **Keyboard-shortcut help.** A `?` button in the navbar opens a dialog listing
  the shortcuts, rendered with the shadcn `Kbd` component (moved out of the
  sidebar tip).
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
> `nata-photo-db.json` files are reset on first open.

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
