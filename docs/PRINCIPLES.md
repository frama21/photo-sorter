# Engineering & Product Principles

The values that guide how Nata Photo is built and how we decide trade-offs, expressed as concrete, testable commitments rather than slogans.

Version 2.2.0 · Last updated 2026-07-19 · Status: Living document

---

## Code-craft principles (Clean Code · YAGNI · DRY · KISS · Semantic · A11y)

Beyond the product principles below, **all code in this repository is written and reviewed against six craft principles**. They are non-negotiable review criteria, and the codebase has been audited against them.

### Clean Code

Small, single-responsibility functions with intention-revealing names; no dead code; comments explain _why_, not _what_. Formatting is enforced by Prettier (`pnpm format`, config in [.prettierrc](../.prettierrc)) and linting by ESLint (`pnpm lint`). Example: the file-operation helpers in [useFileSystem.ts](../src/features/file-system/model/useFileSystem.ts) (`fileExists`, `getUniqueFileName`, `writeFileTo`, `moveFileHandle`) are pure and named for exactly what they do.

### YAGNI — You Aren't Gonna Need It

We build only what the product needs today. There is no router (the app is a single view), no state library beyond a tiny Zustand toast store, no backend, and no speculative abstraction layers. Metadata and RAW previews are computed lazily, on demand — never "just in case".

### DRY — Don't Repeat Yourself

Shared logic lives in one place: `megapixelsFrom()` in [exifService.ts](../src/shared/services/exifService.ts) serves both the image and video paths; the four database writers funnel through a single `mutateDatabase()` read-modify-write helper in [dbService.ts](../src/shared/services/dbService.ts); the security-header set is defined once per deployment target and mirrored, not re-derived.

### KISS — Keep It Simple

The simplest thing that works: a single JSON file for persistence, a promise chain (not a lock library) for write serialization, plain `<img>`/`<video>` tags for previews, and an ~180-line Express server instead of a reverse-proxy stack.

### Semantic

Meaningful names and semantic HTML: landmark elements (`<header>`, `<main>`), real `<button>`s, `<code>` for the database filename, and a `role="status"` live region for toasts. Types model the domain (`PhotoFile`, `SortFolder`, `SortOperation`) instead of leaking primitives.

### A11y — Accessibility

Full keyboard operation with a typing-guard, `aria-label`s on icon-only controls, `sr-only` labels, a visible focus ring, a `role="status"`/`aria-live` region for status changes, and a viewport that **permits user zoom** (WCAG 1.4.4 / 1.4.10). See [UI-Design.md](UI-Design.md) for the full treatment.

> **Audit result (2026-07-14).** The codebase was reviewed against these six principles and brought into compliance — extracting `mutateDatabase()` and `megapixelsFrom()` (DRY), restoring pinch-zoom and adding the live-status region (A11y), and applying Prettier repo-wide (Clean Code). `pnpm build`, `pnpm lint`, and `pnpm format:check` all pass.

---

## Longevity principles (Readable · Understandable · Reusable · Scalable · Maintainable · Easy to Hand Over)

The six craft principles above keep individual files clean; these six keep the **whole project** healthy over time. They are what make Nata Photo something a new contributor can pick up, reason about, and extend without fear. They are realized structurally by the **Feature-Sliced Design (FSD)** layout adopted in this release — `src/{app,pages,features,shared}` with a strict one-way dependency rule (`app → pages → features → shared`) and a public-API `index.ts` barrel per slice. See [ARCHITECTURE.md §3](ARCHITECTURE.md#3-module--component-map).

### Readable

Code reads top-to-bottom like prose: intention-revealing names, small functions, and consistent formatting (Prettier) and ordering. Imports are grouped (external → `@/shared` → `@/features` → local) and every file does one thing the filename promises. You should never need a debugger to understand *what* a file does — only *why*, which the comments cover.

### Understandable (Easy to Understand)

The mental model is small and uniform. There is exactly one place each kind of thing lives (a feature owns its `ui/`, `model/`, `lib/`, `constants.ts`; cross-cutting code lives in `shared/`), so "where does X go?" always has one answer. Data flows one way: the `useFileSystem` controller owns session state and passes slices down as props; pages compose features; features never reach up. A reader can hold the whole shape in their head.

### Reusable

Shared, generic building blocks are factored out and used everywhere, never copy-pasted: the `shared/ui` primitives (shadcn/Radix, plus `PanelHeader`, `Thumbnail`, and the `WithTooltip` wrapper used by every icon button), the `cn()` utility, the i18n `t()`/`useTranslation()` API, and pure helpers (`getUniqueFileName`, `megapixelsFrom`, `validateFolderName`, `validateShortcut`). A change to a shared component updates every consumer at once.

### Scalable

The structure grows without churn. A new capability is a new folder under `features/` (or a new page under `pages/`) with its own barrel — nothing else has to move. A new language is one JSON file under `shared/i18n/language/` plus one line. A new file format is one declarative entry in `config/fileFormats.ts`. Growth is additive, not invasive, and the dependency rule keeps the graph acyclic as it expands.

### Maintainable

Changes are safe and localized. Strong TypeScript domain types catch mistakes at the boundary; lint + typecheck + Prettier are enforced by the build; the FSD boundaries mean a change's blast radius is its own slice. Comments explain the non-obvious *why*. This is the same commitment as [Principle 10](#principle-10--maintainability--conventions-optimize-for-the-next-contributor), applied at the architectural scale.

### Easy to Hand Over

A stranger can become productive quickly. The docs in [`docs/`](.) describe the product, architecture, and design; [ARCHITECTURE.md](ARCHITECTURE.md) maps every module; this document records the *why* behind decisions; and the folder names are self-describing. Onboarding is "read the tree, read ARCHITECTURE, start in the relevant feature slice" — no tribal knowledge required.

> **How these are verified.** These are not aspirations: the FSD restructure, per-feature barrels, the reusable `WithTooltip`/`PanelHeader` components, the JSON-per-language i18n split, and the single-source-of-truth `fileFormats`/`constants` modules are all in the tree today. `pnpm build`, `pnpm lint`, and `pnpm format:check` gate every change.

---

## How to read this document

Nata Photo is a 100% client-side photo & video sorter: you open a local folder, preview each file in chronological order, and assign it to a sort sub-folder with single-key shortcuts. Nothing is uploaded — every byte is processed in your browser via the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API).

That single fact — *the user's files never leave their machine* — is the root from which most of these principles grow. Each principle below has three parts:

- **Statement** — a one-line commitment.
- **Why** — the reasoning and the risk we are managing.
- **How it shows up in this codebase** — concrete files, functions, and behaviors you can point at and verify.

These principles are ordered roughly by how load-bearing they are, not alphabetically. When two principles conflict on a specific decision, the [Decision-making guide](#decision-making-guide) at the end explains how we break the tie.

Related reading: [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md), [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Principle 1 — Privacy & local-first: the user's data never leaves the device

**Statement.** All processing is local. There is no upload, no telemetry, no analytics, and no network egress of user content — ever.

**Why.** Photos and videos are among the most personal data people own. The moment an app *could* exfiltrate them, users must trust a privacy policy, a server operator, and a supply chain they cannot inspect. We remove that requirement entirely: if the bytes physically cannot leave the browser tab, there is nothing to leak, subpoena, breach, or monetize. Local-first is not a feature we bolt on; it is the product's reason to exist and its strongest security control. Everything else in this document is, in some sense, defending this promise.

**How it shows up in this codebase.**

- File access goes exclusively through the File System Access API. Loading a folder is a direct `window.showDirectoryPicker()` call in [`src/features/file-system/model/useFileSystem.ts`](../src/features/file-system/model/useFileSystem.ts) (`loadDirectory`), and files are read from `FileSystemFileHandle`s the user explicitly granted.
- There is **no fetch/XHR/WebSocket to any user-content endpoint** anywhere in the app. The Content-Security-Policy in [`server/index.js`](../server/index.js) pins `connect-src` to `'self' blob: data:` only — the browser itself forbids sending photo bytes to a third party.
- Persistence is a local JSON file, `nata-photo-db.json`, written *inside the folder the user opened* by [`src/shared/services/dbService.ts`](../src/shared/services/dbService.ts) (`writeDatabaseFile`). State lives next to the data it describes, on the user's disk — not in any cloud.
- RAW decoding (`libraw-wasm`), EXIF parsing (`ExifReader`), and video metadata (`mediainfo.js`) all run in-browser (WebAssembly / Web Workers). No image is ever sent to a decode service.
- No analytics SDK, no error-reporting beacon, no "phone home." Diagnostics are `console.warn`/`console.error` only (e.g. the RAW-decode and metadata-extract failure paths in `useFileSystem.ts`), which stay in the user's own devtools.
- The manifest and README state the promise plainly, and the app is an installable, offline-capable PWA precisely so it can keep working with the network fully disconnected.

---

## Principle 2 — Zero-trust of all input: every byte from outside the code is hostile until proven safe

**Statement.** Treat images, videos, folder names, and the on-disk database as untrusted input. Validate shape and bounds, sanitize, and never let external data drive control flow or memory unchecked.

**Why.** "Local-first" does not mean "trusted-first." The files a user opens may be malformed, adversarially crafted, or downloaded from anywhere. The `nata-photo-db.json` file can be edited by any process with write access to that folder. Folder names are free-form user text that becomes a real filesystem path. A crafted image can carry a decompression bomb; a crafted JSON can attempt prototype pollution. Because we parse *untrusted binary and JSON at rest*, input handling is the largest part of our real attack surface, and we treat all of it as hostile by default.

**How it shows up in this codebase.**

- **The database is treated as untrusted input**, explicitly, in [`src/shared/services/dbService.ts`](../src/shared/services/dbService.ts): the file "lives inside the user's chosen folder, so it is untrusted input: it may be corrupt, or crafted by whoever can write to that folder." Loading runs a three-gate pipeline:
  1. `JSON.parse` inside try/catch → corrupt JSON is rejected with a visible warning, never throws.
  2. `isValidState()` structural validation → wrong shape is rejected.
  3. `parsed.version !== DB_VERSION` (`"2.0"`) → incompatible schema is reset.
- **Prototype-pollution defense.** `safeRecord()` copies records into a **null-prototype object** (`Object.create(null)`) and drops `__proto__`, `constructor`, and `prototype` keys (`DANGEROUS_KEYS`). Nothing an attacker writes into `sortedPhotos` or `metadataCache` can climb the prototype chain.
- **Unbounded-memory defense.** `sanitizeState()` bounds every collection: `MAX_SORTED_ENTRIES` / `MAX_METADATA_ENTRIES` = 100,000, `MAX_FOLDERS` = 1,000, operations sliced to `MAX_OPERATIONS` = 50, and scalar fields (`moveMode`, `currentIndex`) coerced to safe defaults. A malicious DB cannot exhaust memory or inject a bogus mode.
- **Folder-name validation** in [`src/shared/lib/safeName.ts`](../src/shared/lib/safeName.ts) (`validateFolderName`) rejects path separators and Windows-reserved punctuation (`\ / : * ? " < > |`), ASCII control characters, `"."`/`".."`, reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`), trailing dot/space, and names over 200 characters — *before* the name reaches `getDirectoryHandle({ create: true })`. It is defense-in-depth on top of the File System Access API's own segment rejection.
- **Crafted-image DoS is patched.** `ExifReader` was bumped `^4.38.1 → ^4.41.0` to close GHSA-h64w-w9pr-82m4 (HIGH — crafted ICC `mluc` tag) and GHSA-rr89-w3h9-m66j (MODERATE — unbounded metadata decompression). Since `ExifReader` parses *untrusted user images*, this was the most material dependency finding. See [SECURITY.md](SECURITY.md).
- **Bounded image parsing.** Image metadata reads only the first 2 MB header slice (`MAX_HEADER_BYTES`) in [`src/shared/services/exifService.ts`](../src/shared/services/exifService.ts), and RAW decoding is size-capped (see Principle 6). We never hand an unbounded blob to a decoder.
- **SVGs never execute.** SVGs are rendered via `<img src="blob:…">`, so any embedded `<script>` is inert — the browser treats the image as an image, not a document.
- Restored state is re-checked against live reality: on load, `useFileSystem.ts` drops sort mappings whose target folder no longer exists (`validFolderIds`) and skips DB-listed folders that can't be re-opened, rather than trusting the file blindly.

---

## Principle 3 — Security by default: the safe configuration is the only configuration

**Statement.** Ship the strictest workable Content-Security-Policy, the full security-header set, cross-origin isolation, and a least-privilege runtime — with no opt-out that weakens the defaults.

**Why.** Security that depends on the operator remembering to turn it on is security that is off. A static single-page app that touches the user's whole filesystem via a powerful browser API must earn that power with a hardened delivery layer, so that even a hypothetical injected string has nowhere to go. Defaults are the policy; there is no "insecure mode."

**How it shows up in this codebase.**

- **Strict CSP with no script `unsafe-inline`/`unsafe-eval`.** [`server/index.js`](../server/index.js) sets (verified live):

  ```
  default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none';
  form-action 'self'; img-src 'self' blob: data:; media-src 'self' blob:;
  font-src 'self' data:; style-src 'self' 'unsafe-inline';
  script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:;
  connect-src 'self' blob: data:; manifest-src 'self'; upgrade-insecure-requests
  ```

  Scripts get only `'wasm-unsafe-eval'` (needed to compile the `libraw`/`mediainfo` WASM) — never arbitrary `eval`. To keep the CSP intact, the service worker is registered manually in [`src/app/main.tsx`](../src/app/main.tsx) on `window` load, so `vite-plugin-pwa` injects **no inline script**.
- **Full security-header set** via `helmet` plus a `Permissions-Policy` middleware, all verified live: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, `Cross-Origin-Resource-Policy: same-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-Permitted-Cross-Domain-Policies: none`, `X-DNS-Prefetch-Control: off`, `X-Download-Options: noopen`, `Origin-Agent-Cluster: ?1`, and `X-XSS-Protection: 0` (the legacy, footgun-prone auditor is deliberately disabled).
- **Cross-origin isolation** (COOP + COEP + CORP) is on by default — a prerequisite for the WASM decoders and a hard barrier against cross-origin leakage.
- **Least privilege at the edge.** `Permissions-Policy` denies accelerometer, autoplay, browsing-topics, camera, display-capture, encrypted-media, geolocation, gyroscope, interest-cohort, magnetometer, microphone, midi, payment, publickey-credentials-get, screen-wake-lock, serial, sync-xhr, usb, and xr-spatial-tracking; it allows only `self` fullscreen and picture-in-picture for the media viewer.
- **React auto-escaping** handles all metadata/user text; we never `dangerouslySetInnerHTML` untrusted content.
- **Least privilege in the container** (see Principle 9): non-root `node` user, read-only root filesystem, dropped capabilities, `no-new-privileges`.

See [SECURITY.md](SECURITY.md) for the complete posture and audit results.

---

## Principle 4 — Data safety: never lose or silently corrupt the user's files

**Statement.** No operation may silently overwrite, destroy, or drop user data. Every mutation is reversible, non-destructive by default, and durably recorded.

**Why.** These are irreplaceable photos. A sorter that occasionally clobbers a file, or that "moves" a file into a void when two files share a name, is worse than useless — it is dangerous. The bar is not "usually correct"; it is "a user can trust it with the only copy of a memory." That trust is earned by defaulting to non-destructive actions, making destructive ones undoable, and making the on-disk record impossible to corrupt through normal use.

**How it shows up in this codebase.**

- **Copy is the default mode.** In [`src/features/file-system/model/useFileSystem.ts`](../src/features/file-system/model/useFileSystem.ts), `moveMode` initializes to `"copy"` (`useState<MoveMode>("copy")` — commented `DEFAULT: COPY`). The destructive Cut/move is opt-in.
- **Collision-safe writes — never overwrite.** `getUniqueFileName()` appends `_1`, `_2`, … when a name already exists in the target folder, so a copy or move can never clobber a same-named file. `fileExists()` probes before every write.
- **Full undo with real reversal.** `undoLastOperation` (bound to `Ctrl/Cmd+Z`) reverses the *actual* filesystem effect: for Cut it moves the file back to the root and re-acquires a fresh handle; for Copy it deletes the exact duplicate that was created. The undo entry records `createdName` (the real on-disk name, which may differ after a collision suffix), so undo removes the right file, not a guess. The undo stack is bounded to 20 entries (`prev.slice(-19)` + the new entry).
- **Handles are never stale after a move.** After a Cut, the code re-acquires the handle at its new location (`targetDirHandle.getFileHandle(createdName)`) and marks the photo `moved: true`, so subsequent operations act on the file that actually exists.
- **Serialized, atomic-ish DB writes.** Every DB mutation is a read-modify-write funneled through a single promise chain (`enqueue` / `writeChain` in `dbService.ts`). Holding down a shortcut key fires many operations, but they execute strictly one at a time, so no update is interleaved and dropped. Each write is `createWritable → write → close`.
- **Corrupt/incompatible DB is reset, not trusted.** `loadProjectState` returns `null` (with a visible warning) rather than acting on a bad file, and the app rebuilds a fresh, valid database — data-loss is contained to project *state*, never the photos themselves.
- **The operation log is handle-free and bounded.** `SortOperation` is fully serializable (no handles) and the persisted log is capped at `MAX_OPERATIONS = 50`, so the record can always be written and read back safely.

---

## Principle 5 — Resilience & graceful degradation: fail small, never fail silent, never fail total

**Statement.** Any single file, decoder, or subsystem may fail; the app must contain the failure, tell the user, and keep working.

**Why.** Real folders contain surprises: a truncated RAW, a codec the browser can't decode, an image that fails its first decode, a hung WASM worker. A brittle app treats one bad file as a fatal error for the whole session. A resilient one isolates the blast radius to that one file, degrades the affected feature gracefully, and lets the user carry on sorting everything else. With thousands of files at stake, resilience *is* usability.

**How it shows up in this codebase.**

- **A top-level Error Boundary** wraps the app in [`src/app/main.tsx`](../src/app/main.tsx) (`StrictMode → ErrorBoundary → ThemeProvider → App`), so an unexpected render error shows a recovery UI instead of a white screen.
- **RAW decode is defended on every axis** in [`src/shared/services/rawDecoder.ts`](../src/shared/services/rawDecoder.ts): a 20 s timeout (`LIBRAW_TIMEOUT_MS`), an upstream worker-hang workaround (`patchLibRawWorker()` fixes a `libraw-wasm` bug where a worker error left the decode promise pending forever), an all-white-output sanity check, worker termination after each decode, and a hard skip for files over 80 MB (`MAX_FULL_DECODE_BYTES`). A failed decode returns `null` — the viewer shows a graceful "preview unavailable" state.
- **Failures don't retry-storm.** `useFileSystem.ts` tracks `failedRawDecodesRef` and never re-attempts a decode that already failed for a given file, so one bad RAW doesn't loop.
- **Preview self-healing.** `recreatePreviewUrl` revokes and recreates a photo's object URL after an `<img>` load error, forcing a fresh decode — some large images fail only on first attempt.
- **Metadata extraction is per-file try/catch.** In `loadDirectory`, a file whose capture date can't be read is simply "left uncached — ordering falls back to the file's mtime." Lazy extraction (`extractMetadata`) is wrapped so a failure `console.warn`s and moves on.
- **Video metadata degrades gracefully.** `mediainfo.js`'s `MediaInfoModule.wasm` is not emitted at build time (Vite cannot resolve its runtime `new URL()`), so the extractor catches the failure and returns default metadata rather than breaking the panel — a known, functional (non-security) limitation documented in [SECURITY.md](SECURITY.md).
- **Missing folders are skipped, not fatal.** On restore, a DB-listed folder that can't be re-opened produces a toast (`Folder … tidak ditemukan, dilewati`) and the session continues.
- **Every user-facing async action** in `useFileSystem.ts` (load, add/remove folder, assign, undo) is wrapped in `try/catch/finally` that surfaces a status toast and clears the loading state — the UI never gets stuck spinning.
- **Browser capability is checked up front.** `loadDirectory` guards `"showDirectoryPicker" in window` and tells Firefox/Safari users to use a Chromium browser, instead of throwing an opaque error.

---

## Principle 6 — Performance & responsiveness: stay fast and interactive at thousands of files

**Statement.** Do the least work necessary, as late as possible, and never block the interaction loop. Read headers not whole files; extract lazily; cache aggressively; bound and cap everything.

**Why.** A folder can hold thousands of high-resolution RAWs and videos. Eagerly decoding all of them, or reading each file end-to-end, would make the app unusable. The user's core loop is *look, press a key, next* — and that loop must feel instant. Performance here is a correctness property of the interaction model, not a nice-to-have.

**How it shows up in this codebase.**

- **Header-only reads.** Image metadata parses only the first 2 MB slice (`MAX_HEADER_BYTES`) in [`src/shared/services/exifService.ts`](../src/shared/services/exifService.ts); video uses a chunked reader. We never buffer a whole 40 MB RAW to read a capture date.
- **Lazy, neighbor-aware metadata.** The lazy-extract effect in [`src/features/file-system/model/useFileSystem.ts`](../src/features/file-system/model/useFileSystem.ts) processes only the current photo and its immediate neighbors (`[currentIndex, +1, -1]`), so metadata is ready just before you reach a file, without doing the whole folder up front.
- **Two-layer caching.** Metadata is cached in memory (`metadataByKey`, `metadataCacheRef`) *and* persisted to `nata-photo-db.json` (`metadataCache`), so reopening a folder is effectively instant — the initial chronological sort reuses cached dates and only reads files it has never seen.
- **Bounded concurrency.** The initial capture-date pass runs a fixed pool of up to 8 workers (`Array.from({ length: Math.min(8, total || 1) }, worker)`), and metadata persistence is `debounce`d to 1500 ms — enough parallelism to be fast, capped so we don't thrash the disk or the main thread.
- **Cheap, correct ordering.** `parseCaptureDate` drives a single `sort` with a deterministic tiebreak (`localeCompare` on the key), and falls back to `lastModified` when no date exists.
- **Bounded RAW previews.** [`src/shared/services/rawDecoder.ts`](../src/shared/services/rawDecoder.ts) prefers the *largest embedded JPEG preview* — scanning for `FF D8 FF` SOI markers, validating candidates with `createImageBitmap`, picking the widest, then re-encoding to `≤ 2048 px` (`MAX_PREVIEW_DIM`) so the cache stays small. Full `libraw` sensor decode (half-size, AHD, sRGB) is only the fallback, only when no sharp embedded preview ≥ 800 px (`SHARP_PREVIEW_MIN_WIDTH`) exists, and never for files > 80 MB.
- **Serialized writes prevent lost work *and* redundant work.** The `writeChain` in `dbService.ts` means rapid-fire sorting doesn't spawn overlapping full-file rewrites.
- **Blob-URL discipline.** Object URLs are created on load and revoked on reload/unmount (`revokeAllUrls`), and non-previewable formats (e.g. HEIC) get `url: null` instead of a wasted allocation — keeping memory flat across long sessions.

---

## Principle 7 — Accessibility & inclusivity: usable by keyboard, by screen reader, on any device, in the user's language

**Statement.** The whole workflow must be operable without a mouse, legible to assistive technology, comfortable on phone and desktop, and localized for its audience.

**Why.** Sorting is a high-repetition task; a keyboard-first flow is faster for *everyone* and essential for people who can't use a pointer. Accessibility is not a compliance checkbox — it directly serves the product's core promise of being a fast, ergonomic sorter. And because the audience spans English and Indonesian speakers, the interface is fully bilingual.

**How it shows up in this codebase.**

- **Full keyboard operation.** Number/letter keys assign the current photo to a folder (each folder's shortcut is user-customizable — see below), `←`/`→` navigate, `Space` advances, `U` jumps to the next unsorted file, and `Ctrl/Cmd+Z` undoes — the entire loop needs no mouse. Handlers live in [`ContentViewer`](../src/features/content-viewer/ui/ContentViewer.tsx) / the editor page and are wired to `useFileSystem` actions (`assignPhotoToFolder`, `navigatePhoto`, `jumpToNextUnsorted`, `undoLastOperation`).
- **Customizable, conflict-checked shortcuts.** A folder's sort key is set by clicking its badge and pressing a key. [`validateShortcut`](../src/shared/lib/shortcut.ts) accepts *any* key except reserved app actions ([`RESERVED_SHORTCUT_KEYS`](../src/shared/constants/index.ts) — arrows, Space, `U`, Esc…) and keys already taken by another folder; modifier combinations (Ctrl/Alt/⌘+key) are rejected at capture time, and the recording listener runs in the capture phase so it never triggers a sort.
- **Shortcuts yield to text entry.** Keyboard shortcuts are ignored while typing in an input, so naming a folder never triggers a sort.
- **Screen-reader affordances.** `aria-label`s on every icon-only control, `sr-only` labels on the theme/language toggles, a `role="status"`/`aria-live` region for toasts, and a visible focus ring (`focus-visible` / `outline-ring/50`) make state legible to assistive tech and keyboard users alike.
- **Tooltips on every icon button.** Icon-only controls (toggles, zoom, nav, add/delete folder, batch-clear) are wrapped in the shadcn `WithTooltip` helper ([`src/shared/ui/tooltip.tsx`](../src/shared/ui/tooltip.tsx)) so their purpose is discoverable on hover/focus, with the same localized label as their `aria-label`.
- **Responsive by construction.** Desktop uses a 12-column grid (viewer 8 cols + sticky sidebar 4 cols); mobile stacks to a single column with a fixed bottom `MobileActionBar` (prev/next + one colored button per folder) and swipe navigation (50 px threshold). One codebase serves both.
- **Light/dark theming with system awareness.** `ThemeProvider` (default dark, `storageKey "vite-ui-theme"`) plus a toggle and system option; tokens are defined in OKLCH in [`src/app/styles/globals.css`](../src/app/styles/globals.css) for both `:root` and `.dark`.
- **Bilingual, persisted UI.** The interface ships English (default) and Indonesian via **i18next + react-i18next**, with a navbar language toggle. Strings live in one JSON file per language under [`src/shared/i18n/language/`](../src/shared/i18n/language/); the choice is persisted to `localStorage` under `lumen-storage` and `<html lang>` is kept in sync for assistive tech. A module-level `t()` localizes non-React code (services, the class `ErrorBoundary`) too. (Code, comments, README, and CHANGELOG remain English — see [Coding conventions](#coding-conventions).)

---

## Principle 8 — Simplicity & a small attack surface: prefer less

**Statement.** Favor the smallest set of dependencies, the simplest architecture, and the least code that solves the problem. Every dependency and every abstraction must earn its place.

**Why.** Every dependency is attack surface, supply-chain risk, and maintenance cost; every abstraction is something a future contributor must learn. A photo sorter does not need a router, a state-management framework per feature, or a backend database. Keeping the system small keeps it auditable — you can hold the whole thing in your head, and `pnpm audit` has less to worry about. Simplicity is a security control and a longevity strategy.

**How it shows up in this codebase.**

- **No router.** It is a single view. [`src/app/main.tsx`](../src/app/main.tsx) normalizes any non-`/` path back to `/`; the whole app is [`src/app/App.tsx`](../src/app/App.tsx) composing a handful of components. No routing library, no navigation state to secure.
- **No backend for the app.** Persistence is a local JSON file, not a server or an embedded DB engine. The only server, [`server/index.js`](../server/index.js), is a *static file server* — Express 5 + `helmet` + `compression`, nothing more.
- **One controller, clear boundaries.** State orchestration lives in one hook, [`src/features/file-system/model/useFileSystem.ts`](../src/features/file-system/model/useFileSystem.ts); pure services are cleanly separated (`dbService`, `exifService`, `rawDecoder`); a single Zustand store (`statusStore`) holds only transient toasts (max 3, auto-expiring). Responsibilities don't smear across the codebase.
- **Dependency hygiene as a security fix.** The audit found the `shadcn` CLI wrongly listed under `dependencies`, dragging a large server-side tree (`hono`, `qs`, `js-yaml`, `@babel/core`, `@modelcontextprotocol/sdk`) into the *production* graph — none of which ships in the browser bundle. It was moved to `devDependencies` (still needed at build time for the `shadcn/tailwind.css` import). Remaining transitive dev/build-only advisories were pinned via `pnpm.overrides`. Result: `pnpm audit` reports **"No known vulnerabilities found"** for both the full tree and `--prod`. See [SECURITY.md](SECURITY.md).
- **Runtime image ships only what runs.** The Docker runtime stage carries only `server/index.js`, audited production `node_modules` (express, helmet, compression), and the built `dist` — no build toolchain, no dev dependencies.
- **Small, obvious helpers.** File operations are pure functions with no component state (`fileExists`, `getUniqueFileName`, `writeFileTo`, `moveFileHandle`), and `moveFileHandle` prefers the native `handle.move()` and only falls back to copy-then-delete — the simplest correct thing.

---

## Principle 9 — Reproducible & hardened deployment: build it the same way every time, run it with the least privilege

**Statement.** The app builds deterministically from a locked toolchain and runs in a minimal, locked-down, single container with no ambient authority.

**Why.** A deployment you can't reproduce is a deployment you can't trust or audit. And a static site that (in the browser) touches the user's filesystem should run its server with the smallest possible footprint, so a compromise of the container yields as little as possible. Reproducibility and hardening together make the delivered artifact something you can reason about.

**How it shows up in this codebase.**

- **Locked, multi-stage build.** The [`Dockerfile`](../Dockerfile) has three stages: (1) **build** on `node:22-slim` using `corepack pnpm@9.15.9` and `pnpm install --frozen-lockfile` → `pnpm run build` → `/app/dist`; (2) **server-deps** on `node:22-alpine` with `npm ci --omit=dev` of `server/` from its `package-lock.json`; (3) **runtime** on `node:22-alpine` copying only `server/index.js` + audited `node_modules` + `dist` (as `./public`). Frozen lockfiles (pnpm v9, npm) make dependency resolution reproducible.
- **Runs as non-root with a healthcheck.** The runtime stage runs as the built-in `node` user, `EXPOSE 8080`, a `HEALTHCHECK` hitting `/healthz` via Node's built-in `fetch`, and `CMD ["node","index.js"]`.
- **Container hardening in [`docker-compose.yml`](../docker-compose.yml):** `read_only` root filesystem + `tmpfs /tmp`, `security_opt: no-new-privileges:true`, `cap_drop: ALL`, `init: true` (tini), resource limits (1 CPU / 256 M, 64 M reservation), a healthcheck, `json-file` log rotation (10 m × 3), `restart: unless-stopped`, and port `8080:8080`.
- **A deliberately tiny, correct server.** [`server/index.js`](../server/index.js) serves hashed `/assets/*` immutably and HTML/`sw.js`/manifest with `no-cache`, sets correct `application/wasm` and `.webmanifest` MIME types, allows `GET`/`HEAD` only (`405` otherwise), serves `/.well-known/security.txt`, exposes `/healthz`, does SPA fallback (unknown navigation → `index.html`; missing asset → `404`), gzip/brotli compresses, and shuts down gracefully on `SIGTERM`/`SIGINT`. Config is env-driven: `PORT` (8080), `HOST` (0.0.0.0), `STATIC_DIR`, `TRUST_PROXY`.
- **TLS at the edge, by design.** There is **no nginx and no reverse proxy in the stack** — it deploys as a single container. For public HTTPS, terminate TLS at the platform edge (Cloudflare / load balancer / an existing Caddy or Traefik) and set `TRUST_PROXY=1` so HSTS reflects the external scheme. See [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Principle 10 — Maintainability & conventions: optimize for the next contributor

**Statement.** Write typed, linted, conventionally structured code with clear module boundaries and honest comments, so the codebase stays changeable years from now.

**Why.** Code is read far more than it is written, and an open-source project lives or dies by how easily a newcomer can make a safe change. Strong types catch mistakes at the boundary; consistent structure means you always know where a thing lives; comments that explain *why* (not *what*) preserve the reasoning behind non-obvious choices. Maintainability is what keeps every other principle in this document true over time.

**How it shows up in this codebase.**

- **TypeScript throughout, with real domain types.** [`src/shared/types/index.ts`](../src/shared/types/index.ts) defines `PhotoFile`, `PhotoMetadata`, `SortFolder`, `SortedMapping`, `MoveMode`, `SortOperation`, and `ProjectState`; the DB layer narrows untrusted data through explicit type guards (`isValidState`, the `valueOk` predicates in `safeRecord`) rather than casting blindly.
- **Clear module boundaries (Feature-Sliced Design).** The tree is layered `src/{app,pages,features,shared}` with a one-way dependency rule and a public-API barrel per slice. The controller (`features/file-system/model/useFileSystem.ts`), services (`shared/services/*`), config registry (`shared/config/fileFormats.ts`), store (`shared/store/statusStore.ts`), name/shortcut safety (`shared/lib/*`), i18n (`shared/i18n/*`), and each UI feature (`features/*/ui`) own one concern. Pure helpers carry no React state.
- **Comments explain the *why*.** The most load-bearing decisions are documented in-place: why writes are serialized (`writeChain`), why the DB is treated as untrusted, why the `libRaw` worker is patched, why `createdName` is stored for undo, why Copy is the default. These are the comments a maintainer needs.
- **A single source of truth for formats.** New formats are added declaratively in `config/fileFormats.ts` (`PHOTO_FORMATS` with `extensions`/`mimeTypes`/`label`/`category`/`previewable`) and consumed via `isSupportedImage`, `isPreviewable`, `getFileFormatInfo` — you extend format support in one place.
- **Lint and typecheck are part of the build.** `pnpm build` typechecks then builds; `pnpm lint` runs ESLint. These gates are non-optional in the [Definition of Done](#definition-of-done).
- **Consistent design tokens.** UI styling flows from OKLCH tokens in [`src/app/styles/globals.css`](../src/app/styles/globals.css) and a derived radius scale, so components stay visually coherent without one-off values.

---

## Coding conventions

These are the concrete house rules that operationalize Principle 10.

| Area | Convention |
| --- | --- |
| **Language** | TypeScript everywhere. Prefer explicit domain types (`src/types`) over `any`; narrow untrusted data with type guards, not casts. |
| **Runtime & package manager** | Node 22+, pnpm 9 (lockfile v9). Use `--frozen-lockfile` in CI/Docker. |
| **Modules** | One concern per module. Controller logic in hooks, side-effectful IO in `services/*`, pure helpers stay pure and stateless. |
| **State** | App/session state in `useFileSystem`; only transient toasts in the Zustand `statusStore`. Don't scatter global state. |
| **Comments** | Explain *why*, especially for non-obvious safety/perf decisions. Keep them accurate — a wrong comment is a bug. |
| **Language of text** | Code, comments, README, CHANGELOG in **English**. User-facing UI copy is **bilingual (English + Indonesian)** via i18next — never hard-code display strings; add a key to both `src/shared/i18n/language/{en,id}.json` and render it with `t()`. |
| **UI components** | Compose shadcn/Radix primitives from `src/shared/ui`; style via OKLCH tokens and Tailwind utilities (`cn()` from `src/shared/lib/utils.ts`), not ad-hoc hex values. |
| **Formats** | Add support declaratively in `config/fileFormats.ts`; never hard-code extension checks elsewhere. |
| **Security invariants** | Never weaken the CSP or add `connect-src` egress for user content. Never `dangerouslySetInnerHTML` untrusted data. Render SVG only via `<img>`. Keep the operation log handle-free and serializable. |
| **Filesystem writes** | Route DB writes through `dbService` (the `enqueue`/`writeChain`); never overwrite a user file — go through `getUniqueFileName`. |
| **Resources** | Create object URLs deliberately and revoke them (`revokeAllUrls`, `recreatePreviewUrl`); terminate WASM workers after use. |
| **Errors** | Wrap user-facing async in `try/catch/finally`, surface a status toast, clear loading state. Never let a single bad file abort the session. |
| **Dependencies** | Keep the production graph minimal; build-only tools belong in `devDependencies`. Any new dependency must survive `pnpm audit`. |

---

## Decision-making guide

When a change forces a trade-off, resolve it in this order. Higher rules win.

1. **Privacy first (Principle 1).** If an option would send, log, or leak user content off-device, it is off the table — no matter how convenient. There is no feature worth breaking the local-first promise.
2. **Data safety over everything downstream (Principle 4).** Given a choice, pick the option that cannot lose or corrupt a user's file. Default to non-destructive; make destructive actions undoable; never overwrite silently.
3. **Security by default over convenience (Principles 2, 3).** Don't relax the CSP, widen egress, skip input validation, or grant the container more privilege to make something easier. Treat all external input as hostile.
4. **Resilience over feature completeness (Principle 5).** A feature that can take down the whole session is worse than a smaller feature that degrades gracefully. Contain failure to one file.
5. **Simplicity over cleverness (Principle 8).** Prefer the smallest dependency footprint and the least code. A new dependency or abstraction must clearly earn its place, including its `pnpm audit` cost.
6. **Then optimize for performance, accessibility, and DX (Principles 6, 7, 10)** — within the constraints above. These matter enormously, but never by violating a higher rule.

A useful test for any proposal: *"Does this keep bytes on-device, keep the user's files safe, keep the defaults secure, and keep the failure blast-radius to one file?"* If not, redesign it until it does.

---

## Definition of Done

A change is not done until all of the following hold. This is the shared checklist for any pull request.

- [ ] **`pnpm audit` is clean** — "No known vulnerabilities found" for both the full tree and `--prod`. New advisories are fixed or pinned via `pnpm.overrides`, and build-only tooling stays out of production `dependencies`.
- [ ] **Build passes** — `pnpm build` (typecheck + production build) succeeds with no type errors.
- [ ] **Lint passes** — `pnpm lint` (ESLint) is clean.
- [ ] **Privacy preserved** — no new network egress of user content; `connect-src` unchanged; no telemetry/analytics added.
- [ ] **Input still zero-trusted** — new external data (files, DB fields, names) is validated, bounded, and sanitized; no new prototype-pollution or unbounded-memory path.
- [ ] **Security headers/CSP intact** — no weakening of the CSP or the header set; no inline script introduced; SVG/untrusted HTML still rendered inertly.
- [ ] **Data safety upheld** — no path that can silently overwrite or lose a file; destructive actions remain undoable; DB writes still go through the serialized `writeChain`.
- [ ] **Failure contained** — new async paths have `try/catch/finally`, surface a status, and don't abort the session; new decoders/loops are timeout- and retry-bounded.
- [ ] **Performance respected** — no eager whole-file reads or whole-folder decoding on the hot path; caching and concurrency caps honored.
- [ ] **Accessible & responsive** — keyboard operable, `aria-label`s where needed, works on mobile and desktop, light and dark; UI copy in Indonesian.
- [ ] **Maintainable** — typed, conventionally located, comments explain non-obvious *why*; formats/config changes made in their single source of truth.
- [ ] **Docs updated** — if behavior, deployment, or security posture changed, the relevant docs ([README](../README.md), [CHANGELOG](../CHANGELOG.md), [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md), [DEPLOYMENT.md](DEPLOYMENT.md)) are updated to match.

---

*This is a living document. When a decision teaches us something new about how Nata Photo should be built, we write it down here.*
