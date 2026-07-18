import { useTranslation } from "react-i18next"
import { ChartColumnDecreasing, CheckCircle2, XCircle } from "lucide-react"

import { Card, CardContent } from "@/shared/ui/card"
import PanelHeader from "@/shared/ui/PanelHeader"
import { cn } from "@/shared/lib/utils"

interface StatsProps {
  totalPhotos: number
  sortedCount: number
  stats: {
    success: number
    failed: number
    total: number
  }
}

/** A compact metric tile: big mono number over a small caption. */
const Metric = ({ value, label, tone }: { value: number; label: string; tone: "base" | "good" | "warn" }) => (
  <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-center">
    <p
      className={cn(
        "font-mono text-xl font-bold tabular-nums leading-none",
        tone === "good" && "text-emerald-500 dark:text-emerald-400",
        tone === "warn" && "text-primary"
      )}
    >
      {value}
    </p>
    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
  </div>
)

const Stats = ({ totalPhotos, sortedCount, stats }: StatsProps) => {
  const { t } = useTranslation()
  const unsorted = totalPhotos - sortedCount
  const pct = totalPhotos > 0 ? Math.round((sortedCount / totalPhotos) * 100) : 0

  return (
    <Card size="sm" className="w-full">
      <PanelHeader
        icon={<ChartColumnDecreasing />}
        title={t("stats.title")}
        trailing={<span className="font-mono text-sm font-bold text-primary tabular-nums">{pct}%</span>}
      />
      <CardContent className="space-y-3">
        {/* Sorting progress */}
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("progress.sortAria")}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-chart-5 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Metric value={totalPhotos} label={t("stats.total")} tone="base" />
          <Metric value={sortedCount} label={t("stats.sorted")} tone="good" />
          <Metric value={unsorted} label={t("stats.remaining")} tone="warn" />
        </div>

        {/* Operation tallies */}
        <div className="flex items-center gap-2 border-t border-border/60 pt-3 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <span className="font-mono tabular-nums">{stats.success}</span> {t("stats.success")}
          </span>
          {stats.failed > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/12 px-2.5 py-1 font-medium text-destructive">
              <XCircle className="size-3.5" />
              <span className="font-mono tabular-nums">{stats.failed}</span> {t("stats.failed")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default Stats
