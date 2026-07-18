import en from "./language/en.json"
import id from "./language/id.json"

export type Language = "en" | "id"

/**
 * Translation tables, one JSON file per language under `./language/`. Keeping the
 * strings in plain JSON keeps them easy to scan, diff, and hand off to
 * translators — add a new language by dropping in `language/<lang>.json` and
 * registering it here and in the i18next `resources` map.
 */
export const translations: Record<Language, Record<string, string>> = { en, id }
