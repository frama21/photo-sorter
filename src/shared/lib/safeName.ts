import { t } from "@/shared/i18n"

// ============================================================
// Filesystem name safety
//
// The File System Access API already rejects path separators and "."/".."
// segments, so it is not itself a path-traversal vector. These checks are
// defense-in-depth for *user-supplied* folder names: they reject values that
// are illegal or dangerous across Windows/macOS/Linux before we ever hand them
// to `getDirectoryHandle({ create: true })`, and give the user a clear reason.
// ============================================================

// Reserved DOS/Windows device names (case-insensitive, with or without a
// trailing extension), e.g. CON, PRN, AUX, NUL, COM1-9, LPT1-9.
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

// Path separators + the Windows-reserved punctuation. Spaces and hyphens are
// intentionally allowed. ASCII control characters are checked separately (see
// hasControlChar) to keep raw control bytes out of the source file.
const ILLEGAL_NAME_CHARS = /[\\/:*?"<>|]/

const MAX_NAME_LENGTH = 200

/** True if the string contains any ASCII control character (U+0000–U+001F). */
const hasControlChar = (s: string): boolean => {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) < 0x20) return true
  }
  return false
}

export type NameValidation = { ok: true; name: string } | { ok: false; reason: string }

/**
 * Validate a user-entered folder name. Returns the trimmed name on success or a
 * human-readable, localized reason (via i18n) on failure.
 */
export const validateFolderName = (raw: string): NameValidation => {
  const name = raw.trim()

  if (!name) {
    return { ok: false, reason: t("folderName.empty") }
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, reason: t("folderName.tooLong", { max: MAX_NAME_LENGTH }) }
  }
  if (name === "." || name === "..") {
    return { ok: false, reason: t("folderName.invalid") }
  }
  if (ILLEGAL_NAME_CHARS.test(name) || hasControlChar(name)) {
    return { ok: false, reason: t("folderName.illegalChars") }
  }
  if (/[. ]$/.test(name)) {
    return { ok: false, reason: t("folderName.trailing") }
  }
  if (RESERVED_WINDOWS_NAMES.test(name)) {
    return { ok: false, reason: t("folderName.reserved", { name }) }
  }

  return { ok: true, name }
}
