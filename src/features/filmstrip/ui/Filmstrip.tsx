import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

import Thumbnail from "@/shared/ui/Thumbnail"
import { ScrollArea } from "@/shared/ui/scroll-area"
import type { PhotoFile, SortedMapping } from "@/shared/types"

interface FilmstripProps {
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
 * A horizontally scrollable strip of thumbnails for quick navigation and
 * selection. Keeps the current photo scrolled into view. Works the same on
 * desktop and mobile (native horizontal scroll).
 */
const Filmstrip = ({
  photos,
  currentIndex,
  selectedKeys,
  sortedPhotos,
  rawPreviewUrls,
  getFolderMeta,
  onOpen,
  onToggleSelect
}: FilmstripProps) => {
  const { t } = useTranslation()
  const currentRef = useRef<HTMLLIElement | null>(null)

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [currentIndex])

  if (photos.length === 0) return null

  return (
    <ScrollArea orientation="horizontal" className="w-full rounded-lg border bg-card">
      <ul aria-label={t("filmstrip.aria")} className="flex list-none gap-2 p-2">
        {photos.map((photo, i) => (
          <li key={photo.key} ref={i === currentIndex ? currentRef : undefined}>
            <Thumbnail
              photo={photo}
              index={i}
              size="sm"
              isCurrent={i === currentIndex}
              isSelected={selectedKeys.has(photo.key)}
              folderMeta={getFolderMeta(sortedPhotos[photo.key])}
              rawPreviewUrl={rawPreviewUrls.get(photo.key)}
              onOpen={onOpen}
              onToggleSelect={onToggleSelect}
            />
          </li>
        ))}
      </ul>
    </ScrollArea>
  )
}

export default Filmstrip
