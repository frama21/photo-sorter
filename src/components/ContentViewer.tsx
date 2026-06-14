import { useEffect, useCallback, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  FileImage,
} from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { PhotoFile, SortFolder } from "@/types";

interface ContentViewerProps {
  photo: PhotoFile | null;
  currentIndex: number;
  totalPhotos: number;
  currentFolder: SortFolder | null;
  rawPreviewUrl: string | null;
  isDecodingRaw: boolean;
  onNavigate: (direction: "next" | "prev") => void;
  onAssign: (index: number, shortcut: string) => void;
  onJumpUnsorted: () => void;
  onUndo: () => void;
  onPreviewError: (photoKey: string) => void;
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
  onPreviewError,
}: ContentViewerProps) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgRetries, setImgRetries] = useState(0);
  const [trackedKey, setTrackedKey] = useState(photo?.key);
  const minSwipeDistance = 50;

  // Reset load/retry state when the displayed photo changes (render-phase reset
  // per React's "adjusting state when a prop changes" pattern).
  if (photo?.key !== trackedKey) {
    setTrackedKey(photo?.key);
    setImgLoaded(false);
    setImgRetries(0);
  }

  const isRaw = photo?.format.category === "raw";
  const hasPreview = Boolean(photo?.url) || rawPreviewUrl !== null;
  const displayUrl = photo?.url || rawPreviewUrl;
  const isVideo = photo?.format.category === "video";

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't hijack keystrokes while the user is typing in a form field.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowRight") onNavigate("next");
      if (e.key === "ArrowLeft") onNavigate("prev");
      if (e.key >= "1" && e.key <= "9") onAssign(currentIndex, e.key);
      if (e.key === " ") {
        e.preventDefault();
        onNavigate("next");
      }
      if (e.key === "u" || e.key === "U") onJumpUnsorted();
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        onUndo();
      }
    },
    [currentIndex, onNavigate, onAssign, onJumpUnsorted, onUndo],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const distance = touchStart - e.changedTouches[0].clientX;
    if (distance > minSwipeDistance) onNavigate("next");
    if (distance < -minSwipeDistance) onNavigate("prev");
    setTouchStart(null);
  };

  if (!photo) {
    return (
      <div className="flex items-center justify-center h-[50vh] md:h-[70vh] bg-dark-800 rounded-2xl border border-dark-700">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            Tidak ada foto untuk ditampilkan
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className="pb-0">
      <CardHeader className="px-0">
        <div
          className="relative overflow-hidden select-none"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex justify-between items-center pb-3 px-5">
            <div className="flex flex-col gap-2">
              <span className="text-sm truncate">{photo.name}</span>
              <div className="flex flex-row gap-2">
                <Badge>{photo.format.label}</Badge>
              </div>
            </div>
            <div>
              {currentFolder ? (
                <Badge className={`text-white ${currentFolder.color}`}>
                  <Check className="w-3 h-3" />
                  {currentFolder.name}
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                >
                  Belum di sortir
                </Badge>
              )}
            </div>
          </div>

          {/* Image */}
          <div className="flex items-center justify-center">
            {hasPreview ? (
              isVideo ? (
                <video
                  key={photo.key}
                  src={displayUrl!}
                  className="w-full max-h-[75vh] object-contain"
                  controls
                />
              ) : (
                <div className="relative w-full flex items-center justify-center min-h-[40dvh]">
                  {!imgLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Spinner className="size-10" />
                    </div>
                  )}
                  <img
                    key={photo.key}
                    src={displayUrl!}
                    alt={photo.name || "Pratinjau foto"}
                    className="w-full max-h-[75vh] object-contain"
                    draggable={false}
                    decoding="async"
                    onLoad={() => setImgLoaded(true)}
                    onError={() => {
                      // Some large images fail the first decode; recreate the
                      // object URL and retry instead of needing a manual reload.
                      if (!isRaw && imgRetries < 2) {
                        setImgRetries((r) => r + 1);
                        onPreviewError(photo.key);
                      } else {
                        setImgLoaded(true); // give up: hide the spinner
                      }
                    }}
                  />
                </div>
              )
            ) : isRaw && isDecodingRaw ? (
              <Empty className="h-[50dvh]">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Spinner className="size-12" />
                  </EmptyMedia>
                  <EmptyTitle>Mendecode RAW...</EmptyTitle>
                  <EmptyDescription>
                    Ini mungkin memerlukan waktu beberapa detik
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Empty className="h-[50dvh]">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="w-16 h-16 border-2">
                    <FileImage className="size-12" />
                  </EmptyMedia>
                  <EmptyTitle>{photo.format.label}</EmptyTitle>
                  <EmptyDescription>Preview tidak tersedia</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>

          {/* Navigation  */}
          <Button
            variant="outline"
            size="icon"
            aria-label="Foto sebelumnya"
            className="hidden md:flex absolute left-4 top-1/2 p-6 bg-white/50 hover:bg-white/70 rounded-full transition-all disabled:opacity-30"
            disabled={currentIndex === 0}
            onClick={() => onNavigate("prev")}
          >
            <ChevronLeft className="size-10" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            aria-label="Foto selanjutnya"
            className="hidden md:flex absolute right-4 top-1/2 p-6 bg-white/50 hover:bg-white/70 rounded-full transition-all disabled:opacity-30"
            disabled={currentIndex === totalPhotos - 1}
            onClick={() => onNavigate("next")}
          >
            <ChevronRight className="size-10" />
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
};

export default ContentViewer;
