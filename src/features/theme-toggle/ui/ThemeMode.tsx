import { Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/shared/ui/button"
import { WithTooltip } from "@/shared/ui/tooltip"
import { useTheme } from "@/app/providers"

export const ModeToggle = () => {
  const { setTheme, theme } = useTheme()
  const { t } = useTranslation()

  const isDarkTheme = theme === "dark"

  const toggleTheme = () => {
    if (isDarkTheme) {
      setTheme("light")
    } else {
      setTheme("dark")
    }
  }

  return (
    <WithTooltip label={t("theme.toggle")}>
      <Button variant="outline" size="icon" aria-label={t("theme.toggle")} onClick={toggleTheme}>
        {isDarkTheme ? (
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        ) : (
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        )}
        <span className="sr-only">{t("theme.toggle")}</span>
      </Button>
    </WithTooltip>
  )
}

export default ModeToggle
