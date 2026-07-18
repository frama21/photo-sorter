import { useTranslation } from "react-i18next"
import { Check, X, Scissors, Copy, Logs } from "lucide-react"

import { Card, CardContent } from "@/shared/ui/card"
import PanelHeader from "@/shared/ui/PanelHeader"
import { cn } from "@/shared/lib/utils"

import type { SortOperation } from "@/shared/types"

interface OperationLogProps {
  operations: SortOperation[]
}

const OperationLog = ({ operations }: OperationLogProps) => {
  const { t } = useTranslation()

  if (operations.length === 0) return null

  const recentOps = operations.slice(-3).reverse()

  return (
    <Card size="sm" className="w-full">
      <PanelHeader icon={<Logs />} title={t("log.title")} subtitle={t("log.subtitle")} />
      <CardContent>
        <ul className="flex flex-col gap-2">
          {recentOps.map(op => (
            <li
              key={op.timestamp}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-l-[3px] bg-muted/20 px-3 py-2.5 transition-colors",
                op.success
                  ? "border-emerald-600/30 border-l-emerald-500"
                  : "border-destructive/30 border-l-destructive"
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-lg",
                  op.success
                    ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400"
                    : "bg-destructive/15 text-destructive"
                )}
              >
                {op.success ? <Check className="size-4" /> : <X className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs font-medium">{op.photoName}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  {op.mode === "cut" ? <Scissors className="size-3" /> : <Copy className="size-3" />}
                  <span className="truncate">
                    {op.success
                      ? `${op.mode === "cut" ? t("batch.verbMove") : t("batch.verbCopy")} → ${op.folderName}`
                      : op.error || t("log.failed")}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export default OperationLog
