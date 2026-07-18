import { useEffect, useCallback, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronLeft, ChevronRight, Check, AlertCircle, FileImage, ZoomIn, ZoomOut, Maximize } from "lucide-react"

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { Spinner } from "@/shared/ui/spinner"
import { Card, CardHeader } from "@/shared/ui/card"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { WithTooltip } from "@/shared/ui/tooltip"
import { useZoomPan } from "@/features/content-viewer/lib/useZoomPan"
import { cn } from "@/shared/lib/utils"
import { isReservedShortcutKey } from "@/shared/lib/shortcut"
import type { PhotoFile } from "@/shared/types"
import { LOUPE_SIZE, LOUPE_ZOOM } from "@/features/content-viewer/constants"

interface ContentViewerProps {
  photo: PhotoFile | null
  currentIndex: number
  totalPhotos: number
  currentFolder: { name: string; color: string } | null
  rawPreviewUrl: string | null
  isDecodingRaw: boolean
  onNavigate: (direction: "next" | "prev") => void
  onAssign: (index: number, shortcut: string) => void
  onJumpUnsorted: () => void
  onUndo: () => void
  onPreviewError: (photoKey: string) => void
}

const ContentViewer = ({
  photo,
  currentIndex,
  totalPhotos,
  currentFolder,
  rawPreviewUrl,
  isDecodingRaw,
  onNavigate,
  onAssign,
  onJumpUnsorted,
  onUndo,
  onPreviewError
}: ContentViewerProps) => {
  const { t } = useTranslation()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgRetries, setImgRetries] = useState(0)
  const [trackedKey, setTrackedKey] = useState(photo?.key)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [loupe, setLoupe] = useState<{
    x: number
    y: number
    w: number
    h: number
    cx: number
    cy: number
  } | null>(null)

  // Reset load/retry state when the displayed photo changes (render-phase reset
  // per React's "adjusting state when a prop changes" pattern).
  if (photo?.key !== trackedKey) {
    setTrackedKey(photo?.key)
    setImgLoaded(false)
    setImgRetries(0)
    setLoupe(null)
  }

  const isRaw = photo?.format.category === "raw"
  const hasPreview = Boolean(photo?.url) || rawPreviewUrl !== null
  const displayUrl = photo?.url || rawPreviewUrl
  const isVideo = photo?.format.category === "video"

  const {
    bindContainer,
    transform,
    touchAction,
    isZoomed,
    reset: resetZoom,
    zoomIn,
    zoomOut,
    handlers: zoomHandlers
  } = useZoomPan({
    resetKey: photo?.key,
    onSwipeLeft: () => onNavigate("next"),
    onSwipeRight: () => onNavigate("prev")
  })

  // Desktop hover loupe: track the cursor position over the image.
  const updateLoupe = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = imgRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    setLoupe({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      w: rect.width,
      h: rect.height,
      cx: e.clientX,
      cy: e.clientY
    })
  }
  const hideLoupe = () => setLoupe(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't hijack keystrokes while the user is typing in a form field.
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return
      }

      // Ignore single-key shortcuts when a non-shift modifier is held so OS/
      // browser chords (Cmd+X, Ctrl+1, …) don't trigger file operations. The
      // Ctrl/Cmd+Z undo is handled explicitly below.
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.key !== "z" && e.key !== "Z") return

      if (e.key === "ArrowRight") onNavigate("next")
      if (e.key === "ArrowLeft") onNavigate("prev")
      // Any non-reserved key (no modifier — combos returned above) may be a
      // customizable folder shortcut; the parent resolves it to a folder and
      // ignores keys not bound to one. Reserved keys (Space, U, arrows, Esc…) are
      // fixed actions, so they're excluded.
      if (!isReservedShortcutKey(e.key)) {
        onAssign(currentIndex, e.key.toLowerCase())
      }
      if (e.key === " ") {
        e.preventDefault()
        onNavigate("next")
      }
      if (e.key === "u" || e.key === "U") onJumpUnsorted()
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault()
        onUndo()
      }
    },
    [currentIndex, onNavigate, onAssign, onJumpUnsorted, onUndo]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  if (!photo) {
    return (
      <div className="flex items-center justify-center h-[50vh] md:h-[70vh] bg-card rounded-2xl border border-border">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{t("viewer.noPhoto")}</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="pb-0">
      <CardHeader className="px-0">
        <div className="relative overflow-hidden select-none">
          <div className="flex justify-between items-start gap-2 pb-3 px-5">
            <div className="flex flex-col gap-2 min-w-0">
              <span className="text-sm truncate">{photo.name}</span>
              <div className="flex flex-row flex-wrap gap-2 items-center">
                <Badge>{photo.format.label}</Badge>
                {currentFolder ? (
                  <Badge className={cn("text-white", currentFolder.color)}>
                    <Check className="w-3 h-3" />
                    {currentFolder.name}
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                  >
                    {t("viewer.notSorted")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="flex items-center justify-center">
            {hasPreview ? (
              isVideo ? (
                <video key={photo.key} src={displayUrl!} className="w-full max-h-[75vh] object-contain" controls />
              ) : (
                <div
                  ref={bindContainer}
                  className={cn(
                    "relative w-full flex items-center justify-center min-h-[40dvh] overflow-hidden",
                    isZoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
                  )}
                  style={{ touchAction: touchAction }}
                  {...zoomHandlers}
                >
                  {!imgLoaded && (
                    <div className="absolute inset-0 skeleton rounded-none flex items-center justify-center">
                      <Spinner className="size-8 opacity-70" />
                    </div>
                  )}
                  <img
                    ref={imgRef}
                    key={photo.key}
                    src={displayUrl!}
                    alt={photo.name || t("viewer.photoPreviewAlt")}
                    className="w-full max-h-[75vh] object-contain will-change-transform"
                    style={{ transform: transform }}
                    draggable={false}
                    decoding="async"
                    onMouseMove={updateLoupe}
                    onMouseLeave={hideLoupe}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => {
                      // Some large images fail the first decode; recreate the
                      // object URL and retry instead of needing a manual reload.
                      if (!isRaw && imgRetries < 2) {
                        setImgRetries(r => r + 1)
                        onPreviewError(photo.key)
                      } else {
                        setImgLoaded(true) // give up: hide the spinner
                      }
                    }}
                  />

                  {/* Desktop hover loupe (magnifier). Hidden on touch + while transform-zoomed. */}
                  {loupe && displayUrl && !isZoomed && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none fixed z-30 hidden overflow-hidden rounded-full border-2 border-white/90 shadow-xl md:block"
                      style={{
                        width: LOUPE_SIZE,
                        height: LOUPE_SIZE,
                        left: loupe.cx - LOUPE_SIZE / 2,
                        top: loupe.cy - LOUPE_SIZE / 2,
                        backgroundColor: "var(--card)",
                        backgroundImage: `url("${displayUrl}")`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: `${loupe.w * LOUPE_ZOOM}px ${loupe.h * LOUPE_ZOOM}px`,
                        backgroundPosition: `${-(loupe.x * LOUPE_ZOOM - LOUPE_SIZE / 2)}px ${-(loupe.y * LOUPE_ZOOM - LOUPE_SIZE / 2)}px`
                      }}
                    />
                  )}

                  {/* Zoom controls */}
                  <div
                    className="absolute bottom-3 right-3 flex gap-1 rounded-lg bg-black/50 p-1 backdrop-blur"
                    onMouseDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    onDoubleClick={e => e.stopPropagation()}
                  >
                    <WithTooltip label={t("viewer.zoomOut")}>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        aria-label={t("viewer.zoomOut")}
                        disabled={!isZoomed}
                        onClick={zoomOut}
                      >
                        <ZoomOut className="size-4" />
                      </Button>
                    </WithTooltip>
                    <WithTooltip label={t("viewer.zoomReset")}>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        aria-label={t("viewer.zoomReset")}
                        disabled={!isZoomed}
                        onClick={resetZoom}
                      >
                        <Maximize className="size-4" />
                      </Button>
                    </WithTooltip>
                    <WithTooltip label={t("viewer.zoomIn")}>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        aria-label={t("viewer.zoomIn")}
                        onClick={zoomIn}
                      >
                        <ZoomIn className="size-4" />
                      </Button>
                    </WithTooltip>
                  </div>
                </div>
              )
            ) : isRaw && isDecodingRaw ? (
              <div className="relative w-full h-[50dvh] skeleton rounded-none flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="grid place-items-center size-14 rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
                    <Spinner className="size-7" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm">{t("viewer.decodingRaw")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("viewer.decodingRawHint")}</p>
                  </div>
                </div>
              </div>
            ) : (
              <Empty className="h-[50dvh]">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="w-16 h-16 border-2">
                    <FileImage className="size-12" />
                  </EmptyMedia>
                  <EmptyTitle>{photo.format.label}</EmptyTitle>
                  <EmptyDescription>{t("viewer.previewUnavailable")}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>

          {/* Navigation  */}
          <WithTooltip label={t("viewer.prevPhoto")} side="right">
            <Button
              variant="outline"
              size="icon"
              aria-label={t("viewer.prevPhoto")}
              className="hidden md:flex absolute left-4 top-1/2 p-6 bg-white/50 hover:bg-white/70 rounded-full transition-all disabled:opacity-30"
              disabled={currentIndex === 0}
              onClick={() => onNavigate("prev")}
            >
              <ChevronLeft className="size-10" />
            </Button>
          </WithTooltip>

          <WithTooltip label={t("viewer.nextPhoto")} side="left">
            <Button
              variant="outline"
              size="icon"
              aria-label={t("viewer.nextPhoto")}
              className="hidden md:flex absolute right-4 top-1/2 p-6 bg-white/50 hover:bg-white/70 rounded-full transition-all disabled:opacity-30"
              disabled={currentIndex === totalPhotos - 1}
              onClick={() => onNavigate("next")}
            >
              <ChevronRight className="size-10" />
            </Button>
          </WithTooltip>
        </div>
      </CardHeader>
    </Card>
  )
}

export default ContentViewer
