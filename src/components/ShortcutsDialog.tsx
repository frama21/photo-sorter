import type { ReactNode } from "react"
import { CircleHelp } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

interface Shortcut {
  keys: ReactNode
  label: string
}

const SHORTCUTS: Shortcut[] = [
  {
    keys: (
      <>
        <Kbd>1</Kbd>
        <span className="text-muted-foreground">…</span>
        <Kbd>9</Kbd>
      </>
    ),
    label: "Sortir foto ke folder 1–9"
  },
  {
    keys: (
      <>
        <Kbd>←</Kbd>
        <Kbd>→</Kbd>
      </>
    ),
    label: "Foto sebelumnya / selanjutnya"
  },
  { keys: <Kbd>Space</Kbd>, label: "Foto selanjutnya" },
  { keys: <Kbd>U</Kbd>, label: "Lompat ke foto belum disortir" },
  {
    keys: (
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>Z</Kbd>
      </KbdGroup>
    ),
    label: "Batalkan (undo) aksi terakhir"
  },
  {
    keys: (
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>A</Kbd>
      </KbdGroup>
    ),
    label: "Pilih / batal pilih semua (mode grid)"
  },
  {
    keys: (
      <span className="flex items-center gap-1">
        <Kbd>Shift</Kbd>
        <span className="text-xs text-muted-foreground">+ Klik</span>
      </span>
    ),
    label: "Pilih / batal pilih rentang (grid / filmstrip)"
  }
]

/**
 * A help button (?) that opens a dialog listing the keyboard shortcuts, rendered
 * with the shadcn Kbd component. Lives in the navbar next to the theme toggle.
 */
const ShortcutsDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Pintasan keyboard">
          <CircleHelp className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pintasan Keyboard</DialogTitle>
          <DialogDescription>Percepat menyortir dengan pintasan berikut.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2.5">
          {SHORTCUTS.map(s => (
            <div key={s.label} className="flex items-center justify-between gap-4">
              <span className="text-sm">{s.label}</span>
              <span className="flex shrink-0 items-center gap-1">{s.keys}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Di perangkat sentuh, geser kiri/kanan untuk berpindah foto. <Kbd>Ctrl</Kbd> menjadi <Kbd>⌘</Kbd> di
          macOS. Pintasan diabaikan saat mengetik di kolom teks.
        </p>
      </DialogContent>
    </Dialog>
  )
}

export default ShortcutsDialog
