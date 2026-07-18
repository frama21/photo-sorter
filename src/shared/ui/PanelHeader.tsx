import type { ReactNode } from "react"

import { CardHeader, CardTitle } from "@/shared/ui/card"

/**
 * Shared sidebar-panel header: an amber icon tile + display-font title, with an
 * optional subtitle and a trailing slot (e.g. a count badge). Keeps every panel
 * ("Folder Sortir", "Informasi Foto", "Log", "Statistik") visually consistent.
 */
const PanelHeader = ({
  icon,
  title,
  subtitle,
  trailing
}: {
  icon: ReactNode
  title: string
  subtitle?: ReactNode
  trailing?: ReactNode
}) => (
  <CardHeader>
    <CardTitle className="flex flex-row items-center gap-3">
      <span className="grid place-items-center size-9 shrink-0 rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20 [&>svg]:size-5">
        {icon}
      </span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-display text-lg md:text-xl font-extrabold leading-tight">{title}</span>
        {subtitle && <span className="text-xs text-muted-foreground truncate">{subtitle}</span>}
      </div>
      {trailing}
    </CardTitle>
  </CardHeader>
)

export default PanelHeader
