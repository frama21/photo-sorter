import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

import { translations, type Language } from "./translations"

/**
 * i18next setup. English is the default/fallback; the choice is persisted to
 * localStorage under "lumen-storage" by the language detector. Keys are flat and
 * dot-namespaced, so `keySeparator`/`nsSeparator` are disabled to keep dots
 * literal, and interpolation uses single braces (`{name}`) to match the tables.
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: translations.en },
      id: { translation: translations.id }
    },
    fallbackLng: "en",
    supportedLngs: ["en", "id"],
    load: "languageOnly",
    keySeparator: false,
    nsSeparator: false,
    detection: {
      // Only remember an explicit choice — no browser-language guessing, so a
      // first-time visitor always starts in English (the fallback).
      order: ["localStorage"],
      lookupLocalStorage: "lumen-storage",
      caches: ["localStorage"]
    },
    interpolation: {
      escapeValue: false, // React already escapes
      prefix: "{",
      suffix: "}"
    }
  })

/** Module-level translate for non-React code (services, class components). */
export const t = (key: string, params?: Record<string, string | number>): string => i18n.t(key, params)

export type { Language }
export default i18n
