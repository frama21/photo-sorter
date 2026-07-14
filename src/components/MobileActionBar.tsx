import { ChevronLeft, ChevronRight, Scissors, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { SortFolder, MoveMode } from "@/types"

interface MobileActionBarProps {
  folders: SortFolder[]
  moveMode: MoveMode
  currentIndex: number
  onAssign: (photoIndex: number, folderId: string) => Promise<void>
  onNavigate: (direction: "next" | "prev") => void
  totalPhotos: number
}

const MobileActionBar = ({
  folders,
  moveMode,
  currentIndex,
  onAssign,
  onNavigate,
  totalPhotos
}: MobileActionBarProps) => {
  const isEmptyFolder = folders.length === 0

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-2 z-50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-row items-center gap-2">
          <Button
            onClick={() => onNavigate("prev")}
            disabled={currentIndex === 0}
            variant="outline"
            size="icon-lg"
            aria-label="Foto sebelumnya"
          >
            <ChevronLeft className="size-7" />
          </Button>

          {isEmptyFolder && currentIndex !== 0 && <div className="text-xs">Sebelumnya</div>}
        </div>

        {!isEmptyFolder && (
          <div className="flex-1 flex gap-1 overflow-x-auto scrollbar-none">
            {folders.map(folder => (
              <Button
                key={folder.id}
                onClick={() => onAssign(currentIndex, folder.id)}
                aria-label={`Sortir ke ${folder.name}`}
                className={`flex-1 min-w-[60px] py-5 rounded-lg ${folder.color} text-white text-xs font-medium active:scale-95 transition-transform`}
                size="lg"
              >
                <span className="flex flex-col items-center">
                  {moveMode === "cut" ? (
                    <Scissors className="w-3 h-3 opacity-75" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-75" />
                  )}
                  <span className="block truncate w-full text-center">{folder.name}</span>
                </span>
              </Button>
            ))}
          </div>
        )}

        <div className="flex flex-row items-center gap-2">
          {isEmptyFolder && currentIndex !== totalPhotos - 1 && <div className="text-xs">Selanjutnya</div>}
          <Button
            onClick={() => onNavigate("next")}
            disabled={currentIndex === totalPhotos - 1}
            variant="outline"
            size="icon-lg"
            aria-label="Foto selanjutnya"
          >
            <ChevronRight className="size-7" />
          </Button>
        </div>
      </div>
    </div>
  )
}
export default MobileActionBar
