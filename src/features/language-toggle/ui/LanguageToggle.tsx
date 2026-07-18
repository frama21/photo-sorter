import { useTranslation } from "react-i18next"

import { Button } from "@/shared/ui/button"
import { WithTooltip } from "@/shared/ui/tooltip"

/**
 * Toggles the UI language between English and Indonesian. Shows the active
 * language code (EN / ID); the choice persists via i18next's localStorage
 * detector. Sits next to the theme toggle in the navbar.
 */
const LanguageToggle = () => {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage === "id" ? "id" : "en"
  const next = current === "en" ? "id" : "en"

  return (
    <WithTooltip label={t("language.toggle")}>
      <Button
        variant="outline"
        size="icon"
        aria-label={t("language.toggle")}
        onClick={() => i18n.changeLanguage(next)}
      >
        <span aria-hidden className="font-mono text-xs font-bold tracking-tight">
          {current.toUpperCase()}
        </span>
        <span className="sr-only">{t("language.toggle")}</span>
      </Button>
    </WithTooltip>
  )
}

export default LanguageToggle
