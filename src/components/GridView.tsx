import Thumbnail from "@/components/Thumbnail"
import type { PhotoFile, SortedMapping } from "@/types"

interface GridViewProps {
  photos: PhotoFile[]
  currentIndex: number
  selectedKeys: Set<string>
  sortedPhotos: SortedMapping
  rawPreviewUrls: Map<string, string>
  getFolderMeta: (folderId: string | undefined) => { name: string; color: string } | null
  onOpen: (index: number) => void
  onToggleSelect: (index: number, rangeSelect: boolean) => void
}

/**
 * A responsive grid of every photo for bulk overview and multi-selection. The
 * column count scales with the viewport; each cell is the shared Thumbnail.
 */
const GridView = ({
  photos,
  currentIndex,
  selectedKeys,
  sortedPhotos,
  rawPreviewUrls,
  getFolderMeta,
  onOpen,
  onToggleSelect
}: GridViewProps) => {
  if (photos.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
      {photos.map((photo, i) => (
        <Thumbnail
          key={photo.key}
          photo={photo}
          index={i}
          size="md"
          isCurrent={i === currentIndex}
          isSelected={selectedKeys.has(photo.key)}
          folderMeta={getFolderMeta(sortedPhotos[photo.key])}
          rawPreviewUrl={rawPreviewUrls.get(photo.key)}
          onOpen={onOpen}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  )
}

export default GridView
