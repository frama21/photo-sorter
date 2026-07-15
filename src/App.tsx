import { useEffect, useState } from "react"
import {
  FolderOpen,
  ImageOff,
  AlertTriangleIcon,
  CheckCircle2,
  Image as ImageIcon,
  LayoutGrid,
  CheckCheck
} from "lucide-react"

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle } from "@/components/ui/alert"

import Navbar from "@/components/app/Navbar"
import ContentViewer from "@/components/ContentViewer"
import Filmstrip from "@/components/Filmstrip"
import GridView from "@/components/GridView"
import BatchActionBar from "@/components/BatchActionBar"
import FolderManager from "@/components/FolderManager"
import ProgressBar from "@/components/ProgressBar"
import MobileActionBar from "@/components/MobileActionBar"
import OperationLog from "@/components/OperationLog"
import MetadataPanel from "@/components/MetadataPanel"
import Stats from "@/components/Stats"

import useFileSystem from "@/hooks/useFileSystem"
import type { ViewMode } from "@/types"

const App = () => {
  const fs = useFileSystem()
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
    <div className="min-h-screen text-gray-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <Navbar />

      {/* Main */}
      <main className="container mx-auto py-6">
        {fs.error && (
          <Alert className="max-w-md border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-50">
            <AlertTriangleIcon />
            <AlertTitle> {fs.error}</AlertTitle>
          </Alert>
        )}

        {totalPhotos === 0 ? (
          <Empty className="h-[90dvh]">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="w-16 h-16 border-2">
                <ImageOff className="size-12" />
              </EmptyMedia>
              <EmptyTitle>Mulai Sortir Foto</EmptyTitle>
              <EmptyDescription>
                Pilih folder lokal. Folder sortir akan otomatis dibuat di dalamnya. State tersimpan otomatis di
                file <code className="px-2 rounded">photo-sorter-db.json</code>.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row justify-center gap-2">
              <Button size="lg" onClick={fs.loadDirectory} disabled={fs.isLoading}>
                <FolderOpen className="w-4 h-4" />
                {fs.isLoading ? "Membaca..." : "Pilih Folder Foto"}
              </Button>
            </EmptyContent>
            <p className="text-muted-foreground mt-4 text-sm">
              Chrome/Edge/Opera terbaru diperlukan. File diproses secara lokal.
            </p>
          </Empty>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-26">
              {/* Left: viewer / grid (8 cols) */}
              <div className="lg:col-span-8 space-y-3 md:space-y-4">
                {/* View toggle + selection controls */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1" role="group" aria-label="Mode tampilan">
                    <Button
                      variant={viewMode === "single" ? "default" : "outline"}
                      size="sm"
                      aria-pressed={viewMode === "single"}
                      onClick={() => setViewMode("single")}
                    >
                      <ImageIcon className="size-4" />
                      Tunggal
                    </Button>
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="sm"
                      aria-pressed={viewMode === "grid"}
                      onClick={() => setViewMode("grid")}
                    >
                      <LayoutGrid className="size-4" />
                      Grid
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedCount > 0 && (
                      <span className="text-xs text-muted-foreground">{selectedCount} dipilih</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fs.selectAllUnsorted}
                      disabled={unsortedCount === 0}
                    >
                      <CheckCheck className="size-4" />
                      Pilih belum disortir
                    </Button>
                    {selectedCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={fs.clearSelection}>
                        Bersihkan
                      </Button>
                    )}
                  </div>
                </div>

                <ProgressBar current={fs.currentIndex} total={totalPhotos} sorted={sortedCount} />
                {allSorted && (
                  <Alert className="border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-50">
                    <CheckCircle2 />
                    <AlertTitle>Semua {totalPhotos} foto sudah disortir 🎉</AlertTitle>
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
                        const folder = fs.folders.find(f => f.shortcut === shortcut)
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
                <div className="sticky top-24 space-y-4">
                  <FolderManager
                    folders={fs.folders}
                    moveMode={fs.moveMode}
                    onAdd={fs.addFolder}
                    onRemove={fs.removeFolder}
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
        )}
      </main>
    </div>
  )
}

export default App
