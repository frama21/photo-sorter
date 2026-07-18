import { RESERVED_SHORTCUT_KEYS } from "@/shared/constants"
import { t } from "@/shared/i18n"
import type { SortFolder } from "@/shared/types"

export type ShortcutValidation = { ok: true; key: string } | { ok: false; reason: string }

/** True when a key is already bound to a fixed app action ([[RESERVED_SHORTCUT_KEYS]]). */
export const isReservedShortcutKey = (rawKey: string): boolean => rawKey.toLowerCase() in RESERVED_SHORTCUT_KEYS

/**
 * Validate a candidate folder sort-shortcut. Any key is allowed EXCEPT:
 *  - keys already bound to a fixed app action (arrows, Space, U, Esc…);
 *  - keys already assigned to another folder.
 *
 * Modifier combinations (Ctrl/Alt/⌘ + key) are rejected earlier, at capture time,
 * because a pure key string can't carry that information. `folderId` is the
 * folder being edited, excluded from the duplicate check. The normalized
 * (lowercase) key is returned on success — shortcuts match case-insensitively.
 */
export const validateShortcut = (rawKey: string, folders: SortFolder[], folderId: string): ShortcutValidation => {
  const key = rawKey.toLowerCase()

  if (!key) return { ok: false, reason: t("shortcut.oneChar") }
  if (key in RESERVED_SHORTCUT_KEYS) {
    return { ok: false, reason: t("shortcut.reservedUsed", { action: t(RESERVED_SHORTCUT_KEYS[key]) }) }
  }

  const clash = folders.find(f => f.id !== folderId && f.shortcut?.toLowerCase() === key)
  if (clash) {
    return { ok: false, reason: t("shortcut.clash", { key: key.toUpperCase(), name: clash.name }) }
  }

  return { ok: true, key }
}
