import { useTranslation } from "react-i18next"

import { version } from "../../../../package.json"

import ModeToggle from "@/features/theme-toggle"
import LanguageToggle from "@/features/language-toggle"
import StatusIndicator from "@/features/status-indicator"
import ShortcutsDialog from "@/features/shortcuts"

const Navbar = () => {
  const { t } = useTranslation()
  const appVersion = `v${version}`

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 glass">
      <div className="max-w-7xl mx-auto px-3 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Brand mark: stacked aperture blades rendered as a warm gradient tile. */}
          <div className="relative grid place-items-center size-9 rounded-xl bg-gradient-to-br from-primary to-chart-5 shadow-lg shadow-primary/25 ring-1 ring-white/15">
            <span className="font-display text-lg font-extrabold text-primary-foreground leading-none select-none">
              N
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-chart-2 ring-2 ring-background" />
          </div>
          <div className="leading-none">
            <h1 className="font-display font-extrabold text-base md:text-xl tracking-tight">
              Nata<span className="text-primary">Photo</span>
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
              <span className="font-mono">{appVersion}</span>
              <span className="size-1 rounded-full bg-muted-foreground/50" />
              <span className="hidden sm:inline">{t("nav.tagline")}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <StatusIndicator />
          <ShortcutsDialog />
          <LanguageToggle />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}

export default Navbar
