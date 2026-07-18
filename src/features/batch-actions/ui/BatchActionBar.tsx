import { useTranslation } from "react-i18next"
import { Copy, Scissors, X } from "lucide-react"

import { Button } from "@/shared/ui/button"
import { WithTooltip } from "@/shared/ui/tooltip"
import { cn } from "@/shared/lib/utils"
import type { MoveMode, SortFolder } from "@/shared/types"

interface BatchActionBarProps {
  count: number
  folders: SortFolder[]
  moveMode: MoveMode
  onAssignFolder: (folderId: string) => void
  onClear: () => void
}

/**
 * A contextual bar, fixed to the bottom of the viewport, that appears only when
 * one or more photos are selected. It sorts the whole selection into a folder at
 * once. Styled like the mobile action bar: large, tall, colored folder buttons.
 * Horizontally scrollable so many folders fit on small screens.
 */
const BatchActionBar = ({ count, folders, moveMode, onAssignFolder, onClear }: BatchActionBarProps) => {
  const { t } = useTranslation()

  if (count === 0) return null

  const verb = moveMode === "cut" ? t("batch.verbMove") : t("batch.verbCopy")

  return (
    <div
      role="toolbar"
      aria-label={t("batch.toolbarAria", { count })}
      className="fixed inset-x-0 bottom-0 z-[60] border-t bg-card/95 p-2 backdrop-blur-lg"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2">
        <span className="shrink-0 px-1 text-sm font-semibold">{t("editor.selectedCount", { count })}</span>

        {folders.length > 0 ? (
          <div className="flex flex-1 gap-2 overflow-x-auto">
            {folders.map(folder => (
              <Button
                key={folder.id}
                size="lg"
                onClick={() => onAssignFolder(folder.id)}
                aria-label={t("batch.assignAria", { verb, count, name: folder.name })}
                className={cn(
                  "min-w-[72px] flex-1 rounded-lg py-5 text-xs font-medium text-white transition-transform active:scale-95",
                  folder.color
                )}
              >
                <span className="flex flex-col items-center gap-0.5">
                  <span className="flex items-center gap-1">
                    {moveMode === "cut" ? (
                      <Scissors className="w-3 h-3 opacity-75" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-75" />
                    )}
                    {folder.shortcut && <span className="font-bold">{folder.shortcut.toUpperCase()}</span>}
                  </span>
                  <span className="block w-full truncate text-center">{folder.name}</span>
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <span className="flex-1 px-1 text-xs text-muted-foreground">{t("batch.createFolderPrompt")}</span>
        )}

        <WithTooltip label={t("batch.clearAria")}>
          <Button size="icon-lg" variant="outline" onClick={onClear} aria-label={t("batch.clearAria")}>
            <X className="size-6" />
          </Button>
        </WithTooltip>
      </div>
    </div>
  )
}

export default BatchActionBar
