import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Plus, Trash2, FolderOpen, Scissors, Copy, Undo2, SkipForward, FolderPlus } from "lucide-react"

import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs"
import { Button } from "@/shared/ui/button"
import { WithTooltip } from "@/shared/ui/tooltip"
import PanelHeader from "@/shared/ui/PanelHeader"
import { addStatus } from "@/shared/store/statusStore"

import type { SortFolder, MoveMode } from "@/shared/types"

interface FolderManagerProps {
  folders: SortFolder[]
  moveMode: MoveMode
  onAdd: (name: string) => Promise<void>
  onRemove: (folderId: string) => Promise<void>
  onSetShortcut: (folderId: string, rawKey: string | null) => Promise<void>
  onAssign: (photoIndex: number, folderId: string) => Promise<void>
  onMoveModeChange: (mode: MoveMode) => void
  currentIndex: number
  canUndo: boolean
  onUndo: () => void
  onJumpUnsorted: () => void
}

// Lone modifier presses are ignored while recording a shortcut.
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta"])

const FolderManager = ({
  folders,
  moveMode,
  onAdd,
  onRemove,
  onSetShortcut,
  onAssign,
  onMoveModeChange,
  currentIndex,
  canUndo,
  onUndo,
  onJumpUnsorted
}: FolderManagerProps) => {
  const { t } = useTranslation()
  const [newFolderName, setNewFolderName] = useState("")
  // Folder id currently "listening" for its next keypress, or null.
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const totalFolder = folders.length

  // While recording, capture the next keypress (in the capture phase, so the
  // app's global sort/navigate handlers never see it), validate + apply it, and
  // stop recording. Escape cancels.
  useEffect(() => {
    if (!recordingId) return
    const onKey = (e: KeyboardEvent) => {
      // Wait for a real key, not a lone modifier press.
      if (MODIFIER_KEYS.has(e.key)) return
      e.preventDefault()
      e.stopPropagation()
      if (e.key === "Escape") {
        setRecordingId(null)
        return
      }
      // Reject combination keys (Ctrl/Alt/⌘ + key, e.g. Ctrl+P) — Shift is fine
      // since it just produces a different character.
      if (e.ctrlKey || e.altKey || e.metaKey) {
        addStatus({ type: "error", message: t("shortcut.noCombo"), icon: "folder" })
        setRecordingId(null)
        return
      }
      void onSetShortcut(recordingId, e.key)
      setRecordingId(null)
    }
    window.addEventListener("keydown", onKey, { capture: true })
    return () => window.removeEventListener("keydown", onKey, { capture: true })
  }, [recordingId, onSetShortcut, t])

  const handleAdd = async () => {
    const name = newFolderName.trim()
    if (name) {
      await onAdd(name)
      setNewFolderName("")
    }
  }

  return (
    <Card size="sm" className="w-full">
      <PanelHeader
        icon={<FolderOpen />}
        title={t("folder.title")}
        trailing={
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground tabular-nums">
            {totalFolder}
          </span>
        }
      />
      <CardContent className="space-y-4">
        {/* Move mode */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("folder.moveMode")}
          </p>
          <Tabs defaultValue={moveMode} className="w-full gap-2">
            <TabsList className="w-full">
              <TabsTrigger value="copy" onClick={() => onMoveModeChange("copy")}>
                <Copy className="w-3.5 h-3.5" />
                {t("folder.copy")}
              </TabsTrigger>
              <TabsTrigger value="cut" onClick={() => onMoveModeChange("cut")}>
                <Scissors className="w-3.5 h-3.5" />
                {t("folder.cut")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="copy" className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {t("folder.copyHintPre")}
              <strong className="font-semibold text-foreground">{t("folder.copyHintStrong")}</strong>
              {t("folder.copyHintPost")}
            </TabsContent>
            <TabsContent value="cut" className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {t("folder.cutHintPre")}
              <strong className="font-semibold text-foreground">{t("folder.cutHintStrong")}</strong>
              {t("folder.cutHintPost")}
            </TabsContent>
          </Tabs>
        </div>

        {/* Add folder */}
        <div className="space-y-2">
          <label
            htmlFor="new-folder-name"
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t("folder.add")}
          </label>
          <div className="flex gap-2">
            <Input
              id="new-folder-name"
              placeholder={t("folder.namePlaceholder")}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAdd()
                }
              }}
            />
            <WithTooltip label={t("folder.addAria")}>
              <Button
                size="icon"
                aria-label={t("folder.addAria")}
                disabled={!newFolderName.trim()}
                onClick={handleAdd}
              >
                <Plus />
              </Button>
            </WithTooltip>
          </div>
        </div>

        {/* Folder list */}
        {folders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-6 text-center text-muted-foreground">
            <FolderPlus className="size-6 opacity-70" />
            <p className="text-xs">{t("folder.empty")}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2" aria-label={t("folder.listAria")}>
            {folders.map(folder => (
              <li
                key={folder.id}
                className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 transition-colors hover:border-border hover:bg-muted/50"
              >
                <WithTooltip label={t("folder.editShortcutTitle")}>
                  <button
                    type="button"
                    onClick={() => setRecordingId(id => (id === folder.id ? null : folder.id))}
                    aria-label={t("folder.editShortcutAria", { name: folder.name })}
                    className={`grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white shadow-sm ring-offset-2 ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${folder.color} ${
                      recordingId === folder.id ? "animate-pulse ring-2 ring-ring" : "hover:brightness-110"
                    }`}
                  >
                    {recordingId === folder.id ? "?" : folder.shortcut ? folder.shortcut.toUpperCase() : "•"}
                  </button>
                </WithTooltip>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {recordingId === folder.id ? (
                      <span className="text-primary">{t("folder.recording")}</span>
                    ) : folder.shortcut ? (
                      <>
                        {t("folder.press")}{" "}
                        <kbd className="rounded bg-background px-1 font-mono text-[10px] ring-1 ring-border">
                          {folder.shortcut.toUpperCase()}
                        </kbd>
                      </>
                    ) : (
                      t("folder.setShortcutHint")
                    )}
                  </p>
                </div>
                <Button size="sm" onClick={() => onAssign(currentIndex, folder.id)}>
                  {t("common.sort")}
                </Button>
                <WithTooltip label={t("folder.removeAria", { name: folder.name })}>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("folder.removeAria", { name: folder.name })}
                    className="text-muted-foreground opacity-60 transition hover:text-destructive hover:opacity-100"
                    onClick={() => onRemove(folder.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </WithTooltip>
              </li>
            ))}
          </ul>
        )}

        {/* Quick actions */}
        <div className="flex flex-row gap-2 border-t border-border/60 pt-3">
          <Button variant="outline" className="flex-1" disabled={!canUndo} onClick={onUndo}>
            <Undo2 className="w-3.5 h-3.5" />
            {t("common.undo")}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onJumpUnsorted}>
            <SkipForward className="w-3.5 h-3.5" />
            {t("folder.jumpUnsorted")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default FolderManager
