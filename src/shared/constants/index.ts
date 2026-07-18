/**
 * App-wide constants shared across features. Feature-local magic values live in
 * that feature's own `constants.ts` (e.g. features/content-viewer/constants.ts);
 * only cross-cutting values belong here.
 */

/** Tailwind background classes cycled through when auto-coloring new folders. */
export const FOLDER_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-orange-500",
  "bg-teal-500"
] as const

/** Maximum reversible sort operations kept on the undo stack. */
export const MAX_UNDO = 20

/** Parallel workers for the initial capture-date/metadata scan (bounded so we
 *  don't thrash the disk or main thread — see PRINCIPLES.md Principle 6). */
export const METADATA_CONCURRENCY = 8

/** Debounce (ms) before persisting freshly-extracted metadata to the DB. */
export const METADATA_PERSIST_DEBOUNCE_MS = 1500

/**
 * Keys already bound to a fixed app action, so a folder sort-shortcut may not
 * reuse them. Keyed by the normalized (lowercase) `KeyboardEvent.key`, valued by
 * the i18n key of a human label used in the conflict message. Every other key is
 * allowed as a shortcut; only modifier combinations (Ctrl/Alt/⌘ + key) are also
 * blocked, and that check happens at capture time (the key string alone can't
 * carry modifier state).
 */
export const RESERVED_SHORTCUT_KEYS: Record<string, string> = {
  u: "reserved.jumpUnsorted",
  " ": "reserved.nextPhoto",
  arrowleft: "reserved.prevPhoto",
  arrowright: "reserved.nextPhoto",
  arrowup: "reserved.navigation",
  arrowdown: "reserved.navigation",
  escape: "reserved.clearSelection",
  enter: "reserved.defaultAction",
  tab: "reserved.focusNav"
}
