import { useState } from "react"
import { Plus, Trash2, FolderOpen, Scissors, Copy, Undo2, SkipForward } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Item,
  ItemMedia,
  ItemGroup,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle
} from "@/components/ui/item"
import { Button } from "@/components/ui/button"

import type { SortFolder, MoveMode } from "@/types"

interface FolderManagerProps {
  folders: SortFolder[]
  moveMode: MoveMode
  onAdd: (name: string) => Promise<void>
  onRemove: (folderId: string) => Promise<void>
  onAssign: (photoIndex: number, folderId: string) => Promise<void>
  onMoveModeChange: (mode: MoveMode) => void
  currentIndex: number
  canUndo: boolean
  onUndo: () => void
  onJumpUnsorted: () => void
}

const FolderManager = ({
  folders,
  moveMode,
  onAdd,
  onRemove,
  onAssign,
  onMoveModeChange,
  currentIndex,
  canUndo,
  onUndo,
  onJumpUnsorted
}: FolderManagerProps) => {
  const [newFolderName, setNewFolderName] = useState("")
  const totalFolder = folders.length

  const handleAdd = async () => {
    const name = newFolderName.trim()
    if (name) {
      await onAdd(name)
      setNewFolderName("")
    }
  }

  return (
    <Card size="sm" className="w-full">
      <CardHeader>
        <CardTitle className="flex flex-row items-center gap-3">
          <FolderOpen className="w-6 h-6" />
          <span className="text-xl font-bold">Folder Sortir</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <Item>
            <ItemContent>
              <ItemTitle>Mode Pemindahan</ItemTitle>
            </ItemContent>
            <ItemActions>
              <div className="w-full">
                <Tabs defaultValue={moveMode} className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="copy" onClick={() => onMoveModeChange("copy")}>
                      <Copy className="w-3.5 h-3.5" />
                      Copy (Duplikat)
                    </TabsTrigger>
                    <TabsTrigger value="cut" onClick={() => onMoveModeChange("cut")}>
                      <Scissors className="w-3.5 h-3.5" />
                      Cut (Pindah)
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="copy">
                    File akan DIDUPLIKAT ke folder target (file asli tetap ada)
                  </TabsContent>
                  <TabsContent value="cut">File akan DIPINDAHKAN ke folder target (file asli dihapus)</TabsContent>
                </Tabs>
              </div>
            </ItemActions>
          </Item>
          <Item>
            <ItemContent>
              <ItemTitle className="w-full">
                <Field>
                  <FieldLabel htmlFor="new-folder-name">Folder {totalFolder ? `(${totalFolder})` : ""}</FieldLabel>
                  <Input
                    id="new-folder-name"
                    placeholder="Nama Folder"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAdd()
                      }
                    }}
                  />
                </Field>
              </ItemTitle>
            </ItemContent>
            <ItemActions>
              <ItemDescription>
                <Button
                  className="mt-7"
                  size="icon"
                  aria-label="Tambah folder"
                  disabled={!newFolderName.trim()}
                  onClick={handleAdd}
                >
                  <Plus />
                </Button>
              </ItemDescription>
            </ItemActions>
          </Item>
        </div>

        <div className="flex flex-col items-center pt-3 pb-5">
          <ItemGroup className="gap-5">
            {folders.map(folder => (
              <Item key={folder.id} variant="outline" role="listitem">
                <ItemMedia>
                  <span
                    className={`w-7 h-7 md:w-8 md:h-8 rounded-lg ${folder.color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}
                  >
                    {folder.shortcut || "-"}
                  </span>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="line-clamp-1">{folder.name}</ItemTitle>
                  <ItemDescription>
                    {folder.shortcut ? `Tekan "${folder.shortcut}"` : "Klik untuk sortir"}
                  </ItemDescription>
                </ItemContent>
                <ItemContent className="flex-none text-center">
                  <div className="flex flex-row items-center gap-3">
                    <Button className="cursor-pointer" onClick={() => onAssign(currentIndex, folder.id)}>
                      Sortir
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      aria-label={`Hapus folder ${folder.name}`}
                      onClick={() => onRemove(folder.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </div>

        {/* Quick actions */}
        <div className="flex flex-row gap-2 pb-3">
          <Button variant="outline" className="flex-1" disabled={!canUndo} onClick={onUndo}>
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </Button>
          <Button variant="outline" className="flex-1" onClick={onJumpUnsorted}>
            <SkipForward className="w-3.5 h-3.5" />
            Belum disortir
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default FolderManager
