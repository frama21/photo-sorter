import { Check, FileImage, Video } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PhotoFile } from "@/types"

interface ThumbnailProps {
  photo: PhotoFile
  index: number
  isCurrent: boolean
  isSelected: boolean
  /** Sort status shown as a colored badge, or null when unsorted. */
  folderMeta: { name: string; color: string } | null
  rawPreviewUrl?: string | null
  /** "sm" for the filmstrip, "md" for the grid. */
  size?: "sm" | "md"
  onOpen: (index: number) => void
  /** rangeSelect is true when the modifier (shift) was held. */
  onToggleSelect: (index: number, rangeSelect: boolean) => void
}

/**
 * A single photo thumbnail used by both the filmstrip and the grid. Renders the
 * image (or a format placeholder for video / RAW / non-previewable), plus
 * selection and sort-status overlays. Two sibling buttons keep the DOM valid
 * and accessible: one opens the photo, one toggles selection.
 */
const Thumbnail = ({
  photo,
  index,
  isCurrent,
  isSelected,
  folderMeta,
  rawPreviewUrl,
  size = "md",
  onOpen,
  onToggleSelect
}: ThumbnailProps) => {
  const isVideo = photo.format.category === "video"
  const isRaw = photo.format.category === "raw"
  const thumbSrc = isVideo ? null : isRaw ? (rawPreviewUrl ?? null) : photo.url

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg border bg-muted",
        size === "sm" ? "h-16 w-16 md:h-20 md:w-20" : "aspect-square w-full",
        isCurrent ? "border-primary ring-2 ring-primary" : "border-border",
        isSelected && "ring-2 ring-blue-500"
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(index)}
        aria-label={`Lihat ${photo.name}`}
        aria-current={isCurrent ? "true" : undefined}
        className="block h-full w-full cursor-pointer"
      >
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
            {isVideo ? <Video className="size-5" /> : <FileImage className="size-5" />}
            <span className="text-[9px] uppercase leading-none">{photo.format.label}</span>
          </span>
        )}
      </button>

      {/* Selection checkbox (sibling of the open button — valid, focusable) */}
      <button
        type="button"
        onClick={e => onToggleSelect(index, e.shiftKey)}
        aria-label={isSelected ? `Batalkan pilih ${photo.name}` : `Pilih ${photo.name}`}
        aria-pressed={isSelected}
        className={cn(
          "absolute left-1 top-1 flex size-5 cursor-pointer items-center justify-center rounded border transition-colors",
          isSelected
            ? "border-blue-500 bg-blue-500 text-white"
            : "border-white/70 bg-black/40 text-transparent hover:text-white/80"
        )}
      >
        <Check className="size-3.5" />
      </button>

      {folderMeta && (
        <span
          className={cn(
            "absolute inset-x-1 bottom-1 flex items-center gap-1 rounded px-1 py-0.5 text-[9px] leading-none text-white",
            folderMeta.color
          )}
          title={folderMeta.name}
        >
          <Check className="size-3 shrink-0" />
          {size === "md" && <span className="truncate">{folderMeta.name}</span>}
        </span>
      )}
    </div>
  )
}

export default Thumbnail
