import type { FileFormatConfig } from "@/config/fileFormats";

declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }
}

export interface PhotoMetadata {
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  iso?: number;
  shutterSpeed?: string;
  aperture?: string;
  focalLength?: string;
  dateTaken?: string;
  fileSize: number;
  megapixels: number;
  duration?: number;
  fps?: number;
  videoCodec?: string;
  audioCodec?: string;
  bitrate?: number;
  isVideo: boolean;
  dimensions: { width: number; height: number };
}

export interface PhotoFile {
  id: number;
  /** Stable identifier within a directory (the file name). Used for persisted mappings. */
  key: string;
  name: string;
  handle: FileSystemFileHandle;
  file: File;
  url: string | null;
  size: number;
  format: FileFormatConfig;
  /** May be a lightweight placeholder until metadata is lazily extracted. */
  metadata: PhotoMetadata;
  /** True once a "cut" operation has moved this file out of the source folder. */
  moved?: boolean;
}

export interface SortFolder {
  id: string;
  name: string;
  shortcut: string | null;
  color: string;
  createdAt: number;
  dirHandle: FileSystemDirectoryHandle | null;
}

/** Maps a stable photo key (file name) to the id of the folder it was sorted into. */
export interface SortedMapping {
  [photoKey: string]: string;
}

export type MoveMode = "cut" | "copy";

export type NavigationDirection = "next" | "prev";

/**
 * A fully serializable record of a sort action. Intentionally holds NO
 * FileSystem handles or File objects so it survives JSON.stringify intact.
 */
export interface SortOperation {
  photoName: string;
  folderId: string;
  folderName: string;
  mode: MoveMode;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface ProjectState {
  version: string;
  folders: Array<{
    id: string;
    name: string;
    shortcut: string | null;
    color: string;
    createdAt: number;
  }>;
  sortedPhotos: SortedMapping;
  moveMode: MoveMode;
  currentIndex: number;
  timestamp: number;
}
