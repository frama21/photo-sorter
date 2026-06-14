# Changelog

All notable changes to this project are documented in this file.

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