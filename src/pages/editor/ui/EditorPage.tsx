import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { CheckCircle2, Image as ImageIcon, LayoutGrid, CheckCheck } from "lucide-react"

import { Button } from "@/shared/ui/button"
import { Alert, AlertTitle } from "@/shared/ui/alert"

import ContentViewer from "@/features/content-viewer"
import Filmstrip from "@/features/filmstrip"
import GridView from "@/features/grid-view"
import BatchActionBar from "@/features/batch-actions"
import FolderManager from "@/features/folder-manager"
import ProgressBar from "@/features/progress"
import MobileActionBar from "@/features/mobile-actions"
import OperationLog from "@/features/operation-log"
import MetadataPanel from "@/features/metadata-panel"
import Stats from "@/features/stats"

import type { FileSystemHook } from "@/features/file-system"
import type { ViewMode } from "@/shared/types"

interface EditorPageProps {
  fs: FileSystemHook
}

/**
 * The main sorting workspace, shown once a folder is open: the photo viewer /
 * grid on the left, the folder + metadata + log + stats sidebar on the right,
 * and the mobile/batch action bars. Owns the local view-mode toggle and the
 * grid-only selection shortcuts; all session state comes from the `fs`
 * controller passed in by the app shell.
 */
const EditorPage = ({ fs }: EditorPageProps) => {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<ViewMode>("single")

  const stats = fs.getOperationStats()
  const baseCurrentPhoto = fs.getCurrentPhoto()
  const totalPhotos = fs.photos.length
  const selectedCount = fs.selectedKeys.size

  // Count photos that still need sorting (mappings can outnumber photos if
  // files were deleted on disk, so derive from the live photo list).
  const unsortedCount = fs.photos.filter(p => !fs.sortedPhotos[p.key]).length
  const sortedCount = totalPhotos - unsortedCount
  const allSorted = totalPhotos > 0 && unsortedCount === 0

  // Merge the lazily-extracted metadata into the current photo for display.
  const currentPhoto = baseCurrentPhoto
    ? {
        ...baseCurrentPhoto,
        metadata: fs.metadataByKey.get(baseCurrentPhoto.key) ?? baseCurrentPhoto.metadata
      }
    : null

  const currentRawPreview =
    currentPhoto && currentPhoto.format.category === "raw" ? fs.rawPreviewUrls.get(currentPhoto.key) || null : null

  const onToggleSelect = (index: number, rangeSelect: boolean) =>
    rangeSelect ? fs.selectRangeTo(index) : fs.toggleSelect(index)

  // With a multi-selection active, sorting (folder button or shortcut) applies to
  // the WHOLE selection; otherwise it sorts just the given (current) photo.
  const assignToFolder = (index: number, folderId: string) =>
    fs.selectedKeys.size > 0 ? fs.batchAssignToFolder(folderId) : fs.assignPhotoToFolder(index, folderId)

  // Grid-only shortcuts: Ctrl/Cmd+A toggles select-all, Escape clears selection.
  const { toggleSelectAll, clearSelection } = fs
  useEffect(() => {
    if (viewMode !== "grid") return
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
      if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        e.preventDefault()
        toggleSelectAll()
      } else if (e.key === "Escape") {
        clearSelection()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [viewMode, toggleSelectAll, clearSelection])

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-26">
        {/* Left: viewer / grid (8 cols) */}
        <div className="lg:col-span-8 space-y-3 md:space-y-4">
          {/* View toggle + selection controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1" role="group" aria-label={t("editor.viewMode")}>
              <Button
                variant={viewMode === "single" ? "default" : "outline"}
                size="sm"
                aria-pressed={viewMode === "single"}
                onClick={() => setViewMode("single")}
              >
                <ImageIcon className="size-4" />
                {t("editor.single")}
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="size-4" />
                {t("editor.grid")}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {selectedCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("editor.selectedCount", { count: selectedCount })}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={fs.selectAllUnsorted} disabled={unsortedCount === 0}>
                <CheckCheck className="size-4" />
                {t("editor.selectUnsorted")}
              </Button>
              {selectedCount > 0 && (
                <Button variant="ghost" size="sm" onClick={fs.clearSelection}>
                  {t("common.clear")}
                </Button>
              )}
            </div>
          </div>

          <ProgressBar current={fs.currentIndex} total={totalPhotos} sorted={sortedCount} />
          {allSorted && (
            <Alert className="border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-50">
              <CheckCircle2 />
              <AlertTitle>{t("editor.allSorted", { count: totalPhotos })}</AlertTitle>
            </Alert>
          )}

          {viewMode === "single" ? (
            <>
              <ContentViewer
                photo={currentPhoto}
                currentIndex={fs.currentIndex}
                totalPhotos={totalPhotos}
                currentFolder={fs.getCurrentFolder()}
                rawPreviewUrl={currentRawPreview}
                isDecodingRaw={fs.isDecodingRaw}
                onNavigate={fs.navigatePhoto}
                onJumpUnsorted={fs.jumpToNextUnsorted}
                onUndo={fs.undoLastOperation}
                onPreviewError={fs.recreatePreviewUrl}
                onAssign={(index, shortcut) => {
                  const key = shortcut.toLowerCase()
                  const folder = fs.folders.find(f => f.shortcut?.toLowerCase() === key)
                  if (folder) assignToFolder(index, folder.id)
                }}
              />
              <Filmstrip
                photos={fs.photos}
                currentIndex={fs.currentIndex}
                selectedKeys={fs.selectedKeys}
                sortedPhotos={fs.sortedPhotos}
                rawPreviewUrls={fs.rawThumbUrls}
                getFolderMeta={fs.getFolderMeta}
                onOpen={fs.goToIndex}
                onToggleSelect={onToggleSelect}
              />
            </>
          ) : (
            <GridView
              photos={fs.photos}
              currentIndex={fs.currentIndex}
              selectedKeys={fs.selectedKeys}
              sortedPhotos={fs.sortedPhotos}
              rawPreviewUrls={fs.rawThumbUrls}
              getFolderMeta={fs.getFolderMeta}
              onOpen={index => {
                fs.goToIndex(index)
                setViewMode("single")
              }}
              onToggleSelect={onToggleSelect}
            />
          )}
        </div>

        {/* Right: Sidebar (4 cols) */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-4 stagger">
            <FolderManager
              folders={fs.folders}
              moveMode={fs.moveMode}
              onAdd={fs.addFolder}
              onRemove={fs.removeFolder}
              onSetShortcut={fs.setFolderShortcut}
              onAssign={assignToFolder}
              onMoveModeChange={fs.setMoveMode}
              currentIndex={fs.currentIndex}
              canUndo={fs.canUndo}
              onUndo={fs.undoLastOperation}
              onJumpUnsorted={fs.jumpToNextUnsorted}
            />

            <MetadataPanel photo={currentPhoto} />
            <OperationLog operations={fs.operations} />
            <Stats totalPhotos={totalPhotos} sortedCount={sortedCount} stats={stats} />
          </div>
        </div>
      </div>

      {/* Mobile Action Bar — hidden while multi-selecting (batch bar takes over) */}
      {viewMode === "single" && selectedCount === 0 && (
        <MobileActionBar
          folders={fs.folders}
          moveMode={fs.moveMode}
          currentIndex={fs.currentIndex}
          onAssign={fs.assignPhotoToFolder}
          onNavigate={fs.navigatePhoto}
          totalPhotos={totalPhotos}
        />
      )}

      <BatchActionBar
        count={selectedCount}
        folders={fs.folders}
        moveMode={fs.moveMode}
        onAssignFolder={fs.batchAssignToFolder}
        onClear={fs.clearSelection}
      />
    </>
  )
}

export default EditorPage
