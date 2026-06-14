import {
  FolderOpen,
  ImageOff,
  AlertTriangleIcon,
  CheckCircle2,
} from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";

import Navbar from "@/components/app/Navbar";
import ContentViewer from "@/components/ContentViewer";
import FolderManager from "@/components/FolderManager";
import ProgressBar from "@/components/ProgressBar";
import MobileActionBar from "@/components/MobileActionBar";
import OperationLog from "@/components/OperationLog";
import MetadataPanel from "@/components/MetadataPanel";
import Stats from "@/components/Stats";

import useFileSystem from "@/hooks/useFileSystem";

const App = () => {
  const fs = useFileSystem();
  const stats = fs.getOperationStats();
  const baseCurrentPhoto = fs.getCurrentPhoto();
  const totalPhotos = fs.photos.length;

  // Count photos that still need sorting (mappings can outnumber photos if
  // files were deleted on disk, so derive from the live photo list).
  const unsortedCount = fs.photos.filter(
    (p) => !fs.sortedPhotos[p.key],
  ).length;
  const sortedCount = totalPhotos - unsortedCount;
  const allSorted = totalPhotos > 0 && unsortedCount === 0;

  // Merge the lazily-extracted metadata into the current photo for display.
  const currentPhoto = baseCurrentPhoto
    ? {
        ...baseCurrentPhoto,
        metadata:
          fs.metadataByKey.get(baseCurrentPhoto.key) ??
          baseCurrentPhoto.metadata,
      }
    : null;

  // Get RAW preview URL untuk foto saat ini
  const currentRawPreview =
    currentPhoto && currentPhoto.format.category === "raw"
      ? fs.rawPreviewUrls.get(currentPhoto.key) || null
      : null;

  return (
    <div className="min-h-screen text-gray-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <Navbar />

      {/* Main */}
      <main className="max-w-[80dvw] mx-auto px-3 md:px-6 py-4 md:py-6">
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
                Pilih folder lokal. Folder sortir akan otomatis dibuat di
                dalamnya. State tersimpan otomatis di file{" "}
                <code className="px-2 rounded">.photo-sorter-db.json</code>.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row justify-center gap-2">
              <Button
                size="lg"
                onClick={fs.loadDirectory}
                disabled={fs.isLoading}
              >
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
              {/* Left: Photo Viewer (8 cols) */}
              <div className="lg:col-span-8 space-y-3 md:space-y-4">
                <ProgressBar
                  current={fs.currentIndex}
                  total={totalPhotos}
                  sorted={sortedCount}
                />
                {allSorted && (
                  <Alert className="border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-50">
                    <CheckCircle2 />
                    <AlertTitle>
                      Semua {totalPhotos} foto sudah disortir 🎉
                    </AlertTitle>
                  </Alert>
                )}
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
                    const folder = fs.folders.find(
                      (f) => f.shortcut === shortcut,
                    );
                    if (folder) fs.assignPhotoToFolder(index, folder.id);
                  }}
                />
              </div>

              {/* Right: Sidebar (4 cols) */}
              <div className="lg:col-span-4">
                <div className="sticky top-24 space-y-4">
                  {/* Folder Manager */}
                  <FolderManager
                    folders={fs.folders}
                    moveMode={fs.moveMode}
                    onAdd={fs.addFolder}
                    onRemove={fs.removeFolder}
                    onAssign={fs.assignPhotoToFolder}
                    onMoveModeChange={fs.setMoveMode}
                    currentIndex={fs.currentIndex}
                    canUndo={fs.canUndo}
                    onUndo={fs.undoLastOperation}
                    onJumpUnsorted={fs.jumpToNextUnsorted}
                  />

                  {/* Metadata Panel */}
                  <MetadataPanel photo={currentPhoto} />

                  {/* Log  */}
                  <OperationLog operations={fs.operations} />

                  {/* Stats */}
                  <Stats
                    totalPhotos={totalPhotos}
                    sortedCount={sortedCount}
                    stats={stats}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Action Bar */}
            <MobileActionBar
              folders={fs.folders}
              moveMode={fs.moveMode}
              currentIndex={fs.currentIndex}
              onAssign={fs.assignPhotoToFolder}
              onNavigate={fs.navigatePhoto}
              currentPhotoIndex={fs.currentIndex}
              totalPhotos={totalPhotos}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default App;
