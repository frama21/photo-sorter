import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import debounce from "lodash.debounce";

import {
  isSupportedImage,
  isPreviewable,
  getFileFormatInfo,
} from "@/config/fileFormats";

import { decodeRawImage } from "@/services/rawDecoder";
import { extractMetadata, parseCaptureDate } from "@/services/exifService";
import {
  initProjectDatabase,
  updateDatabaseAfterOperation,
  updateDatabaseFolders,
  updateDatabaseMode,
  updateDatabaseMetadata,
} from "@/services/dbService";

import type {
  PhotoFile,
  PhotoMetadata,
  SortFolder,
  SortedMapping,
  MoveMode,
  SortOperation,
  NavigationDirection,
} from "@/types";

import { addStatus, clearStatus } from "@/stores/statusStore";

const FOLDER_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-orange-500",
  "bg-teal-500",
];

// Reject characters that are illegal in file/folder names on common platforms.
const INVALID_NAME_CHARS = /[\\/:*?"<>|]/;

interface UndoEntry {
  photoKey: string;
  photoName: string;
  /** The actual name written to the target folder (may differ on collision). */
  createdName: string;
  folderId: string;
  mode: MoveMode;
  photoIndex: number;
}

// === FILE OPERATION HELPERS (pure — no component state) ===
const fileExists = async (
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<boolean> => {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
};

// Avoid silently overwriting: append _1, _2, ... when a name already exists.
const getUniqueFileName = async (
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<string> => {
  if (!(await fileExists(dir, name))) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 1;
  let candidate = `${base}_${i}${ext}`;
  while (await fileExists(dir, candidate)) {
    i += 1;
    candidate = `${base}_${i}${ext}`;
  }
  return candidate;
};

const writeFileTo = async (
  dir: FileSystemDirectoryHandle,
  name: string,
  file: File,
): Promise<FileSystemFileHandle> => {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(file);
  await writable.close();
  return handle;
};

// Move a file handle, using the native move() when available and falling back
// to copy-then-delete otherwise.
const moveFileHandle = async (
  handle: FileSystemFileHandle,
  destDir: FileSystemDirectoryHandle,
  destName: string,
  sourceDir: FileSystemDirectoryHandle,
  sourceName: string,
): Promise<void> => {
  if ("move" in handle) {
    // @ts-expect-error - move() is not yet in the FileSystem lib typings
    await handle.move(destDir, destName);
  } else {
    const file = await handle.getFile();
    await writeFileTo(destDir, destName, file);
    await sourceDir.removeEntry(sourceName);
  }
};

export interface FileSystemHook {
  photos: PhotoFile[];
  currentIndex: number;
  folders: SortFolder[];
  sortedPhotos: SortedMapping;
  isLoading: boolean;
  error: string | null;
  moveMode: MoveMode;
  operations: SortOperation[];
  rawPreviewUrls: Map<string, string>;
  isDecodingRaw: boolean;
  metadataByKey: Map<string, PhotoMetadata>;
  canUndo: boolean;

  loadDirectory: () => Promise<void>;
  addFolder: (name: string) => Promise<void>;
  removeFolder: (folderId: string) => Promise<void>;
  assignPhotoToFolder: (photoIndex: number, folderId: string) => Promise<void>;
  undoLastOperation: () => Promise<void>;
  navigatePhoto: (direction: NavigationDirection) => void;
  jumpToNextUnsorted: () => void;
  recreatePreviewUrl: (photoKey: string) => void;
  setMoveMode: (mode: MoveMode) => void;
  getCurrentPhoto: () => PhotoFile | null;
  getCurrentFolder: () => SortFolder | null;
  getOperationStats: () => { success: number; failed: number; total: number };
}

const useFileSystem = (): FileSystemHook => {
  // === STATE ===
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [folders, setFolders] = useState<SortFolder[]>([]);
  const [sortedPhotos, setSortedPhotos] = useState<SortedMapping>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moveMode, setMoveModeState] = useState<MoveMode>("copy"); // DEFAULT: COPY
  const [operations, setOperations] = useState<SortOperation[]>([]);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  // RAW preview state
  const [rawPreviewUrls, setRawPreviewUrls] = useState<Map<string, string>>(
    new Map(),
  );
  const [isDecodingRaw, setIsDecodingRaw] = useState(false);
  const rawDecodeQueueRef = useRef<Set<string>>(new Set());
  const rawPreviewKeysRef = useRef<Set<string>>(new Set());
  const failedRawDecodesRef = useRef<Set<string>>(new Set());

  // Lazily-extracted metadata, keyed by stable file key.
  const [metadataByKey, setMetadataByKey] = useState<Map<string, PhotoMetadata>>(
    new Map(),
  );
  const metaQueueRef = useRef<Set<string>>(new Set());
  const metadataCacheRef = useRef<Record<string, PhotoMetadata>>({});

  // === REFS ===
  const rootDirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const folderDirHandlesRef = useRef<Map<string, FileSystemDirectoryHandle>>(
    new Map(),
  );
  const isInitializedRef = useRef(false);

  // === BLOB URL LIFECYCLE: revoke to avoid leaking across reloads/unmount ===
  const revokeAllUrls = useCallback(() => {
    setPhotos((prev) => {
      prev.forEach((p) => p.url && URL.revokeObjectURL(p.url));
      return prev;
    });
    setRawPreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return new Map();
    });
    rawPreviewKeysRef.current.clear();
  }, []);

  useEffect(() => {
    // Revoke everything when the hook unmounts.
    return () => revokeAllUrls();
  }, [revokeAllUrls]);

  // === DEBOUNCED METADATA PERSIST ===
  // Inputs are passed as arguments (read at call time inside effects), not
  // closed over, so the debounced function never reads a ref during render.
  const persistMetadata = useMemo(
    () =>
      debounce(
        (
          handle: FileSystemDirectoryHandle,
          cache: Record<string, PhotoMetadata>,
        ) => updateDatabaseMetadata(handle, cache),
        1500,
      ),
    [],
  );

  useEffect(() => {
    // Flush any pending metadata write when the hook unmounts.
    return () => {
      persistMetadata.flush();
    };
  }, [persistMetadata]);

  // === DIRECTORY LOADING ===
  const loadDirectory = useCallback(async () => {
    addStatus({
      type: "loading",
      message: "Memuat folder Project ...",
      icon: "folder",
    });

    try {
      if (!("showDirectoryPicker" in window)) {
        addStatus({
          type: "error",
          message: "Browser tidak mendukung File System Access API",
          icon: "folder",
        });
        throw new Error(
          "Browser tidak mendukung File System Access API. Gunakan Chrome/Edge/Opera terbaru.",
        );
      }

      const dirHandle = await window.showDirectoryPicker();

      // Reloading a (possibly different) folder: drop the previous session.
      revokeAllUrls();
      rawDecodeQueueRef.current.clear();
      failedRawDecodesRef.current.clear();
      metaQueueRef.current.clear();
      setUndoStack([]);

      rootDirHandleRef.current = dirHandle;
      setIsLoading(true);
      setError(null);
      setOperations([]);

      // === INIT DATABASE: Auto-create if not exists ===
      const dbState = await initProjectDatabase(dirHandle);
      const cachedMeta = dbState.metadataCache ?? {};
      metadataCacheRef.current = { ...cachedMeta };

      const imageFiles: PhotoFile[] = [];
      let index = 0;

      // Scan directory for images (top level only).
      for await (const entry of dirHandle.values()) {
        if (entry.kind === "file" && isSupportedImage(entry.name)) {
          const file = await entry.getFile();
          const formatInfo = getFileFormatInfo(entry.name)!;
          const canPreview = isPreviewable(entry.name);
          const key = entry.name;

          // Use cached metadata if present; otherwise a lightweight placeholder.
          const cached = cachedMeta[key];
          const metadata: PhotoMetadata = cached ?? {
            fileSize: file.size,
            megapixels: 0,
            dimensions: { width: 0, height: 0 },
            isVideo: formatInfo.category === "video",
          };

          imageFiles.push({
            id: index++,
            key,
            name: entry.name,
            handle: entry,
            file,
            url: canPreview ? URL.createObjectURL(file) : null,
            size: file.size,
            format: formatInfo,
            metadata,
          });
        }
      }

      // === EXTRACT CAPTURE DATES (concurrent) to order photos chronologically ===
      // Only files without cached metadata are read (header-only), and the cache
      // makes subsequent opens of the same folder instant.
      const cache = metadataCacheRef.current;
      const total = imageFiles.length;
      let processed = 0;
      let cursor = 0;
      const worker = async () => {
        while (cursor < imageFiles.length) {
          const p = imageFiles[cursor++];
          if (!cache[p.key]) {
            try {
              cache[p.key] = await extractMetadata(p.file);
            } catch {
              // Leave uncached — ordering falls back to the file's mtime.
            }
          }
          processed++;
          if (processed === total || processed % 8 === 0) {
            addStatus({
              type: "loading",
              message: `Membaca tanggal foto ${processed}/${total}...`,
              icon: "file",
            });
          }
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(8, total || 1) }, () => worker()),
      );

      // Sort by capture date (oldest first); fall back to file mtime.
      const sortTs = (p: PhotoFile) =>
        parseCaptureDate(cache[p.key]?.dateTaken) ?? p.file.lastModified;
      imageFiles.sort((a, b) => sortTs(a) - sortTs(b) || a.key.localeCompare(b.key));

      const nextMetaMap = new Map<string, PhotoMetadata>();
      for (const p of imageFiles) {
        const meta = cache[p.key];
        if (meta) {
          nextMetaMap.set(p.key, meta);
          p.metadata = meta;
        }
      }

      setPhotos(imageFiles);
      setMetadataByKey(nextMetaMap);

      // Persist the freshly-extracted metadata so future opens are instant.
      updateDatabaseMetadata(dirHandle, cache);

      // === RESTORE STATE from database ===
      const restoredFolders: SortFolder[] = [];
      folderDirHandlesRef.current.clear();
      for (const folder of dbState.folders) {
        try {
          const folderHandle = await dirHandle.getDirectoryHandle(folder.name);
          restoredFolders.push({ ...folder, dirHandle: folderHandle });
          folderDirHandlesRef.current.set(folder.id, folderHandle);
        } catch {
          addStatus({
            type: "error",
            message: `Folder ${folder.name} tidak ditemukan, dilewati`,
            icon: "folder",
          });
          console.warn(`[Hook] Folder ${folder.name} not found, skipping`);
        }
      }

      setFolders(restoredFolders);
      // Drop mappings that point at folders that no longer exist.
      const validFolderIds = new Set(restoredFolders.map((f) => f.id));
      const restoredSorted: SortedMapping = {};
      for (const [photoKey, folderId] of Object.entries(dbState.sortedPhotos)) {
        if (validFolderIds.has(folderId)) restoredSorted[photoKey] = folderId;
      }
      setSortedPhotos(restoredSorted);
      setMoveModeState(dbState.moveMode);
      setCurrentIndex(
        Math.min(dbState.currentIndex, Math.max(imageFiles.length - 1, 0)),
      );
      setOperations(dbState.operations ?? []);

      isInitializedRef.current = true;
      setIsLoading(false);

      addStatus({
        type: "success",
        message: "Project berhasil dimuat",
        icon: "folder",
      });
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
        addStatus({
          type: "error",
          message: "Gagal memuat project",
          icon: "folder",
        });
      }
      setIsLoading(false);
    } finally {
      clearStatus();
    }
  }, [revokeAllUrls]);

  // === LAZY METADATA: extract for current photo (+ neighbors) on demand ===
  useEffect(() => {
    if (photos.length === 0) return;
    const targets = [currentIndex, currentIndex + 1, currentIndex - 1].filter(
      (i) => i >= 0 && i < photos.length,
    );
    let cancelled = false;

    (async () => {
      for (const i of targets) {
        const p = photos[i];
        if (!p) continue;
        if (metadataByKey.has(p.key) || metaQueueRef.current.has(p.key)) continue;

        metaQueueRef.current.add(p.key);
        try {
          const meta = await extractMetadata(p.file);
          if (cancelled) return;
          metadataCacheRef.current[p.key] = meta;
          setMetadataByKey((prev) => new Map(prev).set(p.key, meta));
          const rootHandle = rootDirHandleRef.current;
          if (rootHandle) persistMetadata(rootHandle, metadataCacheRef.current);
        } catch (err) {
          console.warn("[Hook] metadata extract failed:", err);
        } finally {
          metaQueueRef.current.delete(p.key);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentIndex, photos, metadataByKey, persistMetadata]);

  // === RAW DECODE: decode current RAW photo on demand ===
  useEffect(() => {
    const currentPhoto = photos[currentIndex];
    if (!currentPhoto || currentPhoto.format.category !== "raw") return;
    if (rawPreviewKeysRef.current.has(currentPhoto.key)) return;
    if (rawDecodeQueueRef.current.has(currentPhoto.key)) return;
    // Don't retry a decode that already failed for this file.
    if (failedRawDecodesRef.current.has(currentPhoto.key)) return;

    const decodeCurrentRaw = async () => {
      rawDecodeQueueRef.current.add(currentPhoto.key);
      setIsDecodingRaw(true);

      try {
        const url = await decodeRawImage(currentPhoto.file);
        if (url) {
          rawPreviewKeysRef.current.add(currentPhoto.key);
          setRawPreviewUrls((prev) => new Map(prev).set(currentPhoto.key, url));
          failedRawDecodesRef.current.delete(currentPhoto.key);
        } else {
          failedRawDecodesRef.current.add(currentPhoto.key);
        }
      } catch (err) {
        console.error("[Hook] RAW decode failed:", err);
        failedRawDecodesRef.current.add(currentPhoto.key);
      } finally {
        rawDecodeQueueRef.current.delete(currentPhoto.key);
        setIsDecodingRaw(false);
      }
    };

    decodeCurrentRaw();
  }, [currentIndex, photos]);

  // === FOLDER MANAGEMENT ===
  const addFolder = useCallback(
    async (name: string) => {
      const rootHandle = rootDirHandleRef.current;
      if (!rootHandle) {
        setError("Pilih folder foto terlebih dahulu");
        return;
      }

      const folderName = name.trim() || `Folder ${folders.length + 1}`;

      if (INVALID_NAME_CHARS.test(folderName)) {
        const msg = 'Nama folder tidak boleh mengandung \\ / : * ? " < > |';
        setError(msg);
        addStatus({ type: "error", message: msg, icon: "folder" });
        return;
      }
      if (folders.some((f) => f.name.toLowerCase() === folderName.toLowerCase())) {
        const msg = `Folder "${folderName}" sudah ada`;
        setError(msg);
        addStatus({ type: "error", message: msg, icon: "folder" });
        return;
      }

      addStatus({ type: "loading", message: "Membuat folder...", icon: "folder" });

      try {
        const dirHandle = await rootHandle.getDirectoryHandle(folderName, {
          create: true,
        });

        const newFolder: SortFolder = {
          id: crypto.randomUUID(),
          name: folderName,
          shortcut: folders.length < 9 ? (folders.length + 1).toString() : null,
          color: FOLDER_COLORS[folders.length % FOLDER_COLORS.length],
          createdAt: Date.now(),
          dirHandle,
        };

        folderDirHandlesRef.current.set(newFolder.id, dirHandle);
        const updatedFolders = [...folders, newFolder];
        setFolders(updatedFolders);
        setError(null);

        await updateDatabaseFolders(rootHandle, updatedFolders);

        addStatus({
          type: "success",
          message: `Folder "${folderName}" berhasil dibuat`,
          icon: "folder",
        });
      } catch (err) {
        addStatus({ type: "error", message: "Gagal membuat folder", icon: "folder" });
        setError(
          `Gagal membuat folder: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        clearStatus();
      }
    },
    [folders],
  );

  const removeFolder = useCallback(
    async (folderId: string) => {
      const rootHandle = rootDirHandleRef.current;
      const folder = folders.find((f) => f.id === folderId);
      if (!folder || !rootHandle) return;

      addStatus({ type: "loading", message: "Menghapus folder...", icon: "folder" });

      try {
        // recursive: true so a folder that already contains sorted files is
        // actually removed (instead of silently failing and leaving an orphan).
        try {
          await rootHandle.removeEntry(folder.name, { recursive: true });
        } catch (err) {
          console.warn("[Hook] removeEntry failed:", err);
        }

        folderDirHandlesRef.current.delete(folderId);

        const updatedFolders = folders.filter((f) => f.id !== folderId);
        setFolders(updatedFolders);

        // Drop mappings + undo entries pointing at the removed folder.
        setSortedPhotos((prev) => {
          const updated: SortedMapping = {};
          for (const [k, v] of Object.entries(prev)) {
            if (v !== folderId) updated[k] = v;
          }
          return updated;
        });
        setUndoStack((prev) => prev.filter((e) => e.folderId !== folderId));

        await updateDatabaseFolders(rootHandle, updatedFolders);

        addStatus({
          type: "success",
          message: `Folder "${folder.name}" dihapus`,
          icon: "folder",
        });
      } catch (err) {
        addStatus({ type: "error", message: "Gagal menghapus folder", icon: "folder" });
        setError(
          `Gagal menghapus folder: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        clearStatus();
      }
    },
    [folders],
  );

  // === FILE OPERATIONS ===
  const assignPhotoToFolder = useCallback(
    async (photoIndex: number, folderId: string) => {
      const photo = photos[photoIndex];
      const folder = folders.find((f) => f.id === folderId);
      const rootHandle = rootDirHandleRef.current;
      if (!photo || !folder || !rootHandle) return;

      const targetDirHandle =
        folder.dirHandle || folderDirHandlesRef.current.get(folderId);
      if (!targetDirHandle) {
        setError("Folder target tidak ditemukan");
        return;
      }

      addStatus({
        type: "loading",
        message: `${moveMode === "cut" ? "Memindahkan" : "Mengcopy"} ${photo.name}...`,
        icon: "file",
      });

      try {
        const createdName = await getUniqueFileName(targetDirHandle, photo.name);
        let updatedHandle = photo.handle;

        if (moveMode === "cut") {
          await moveFileHandle(
            photo.handle,
            targetDirHandle,
            createdName,
            rootHandle,
            photo.name,
          );
          // Re-acquire the handle at its new location so it is never stale.
          updatedHandle = await targetDirHandle.getFileHandle(createdName);
          setPhotos((prev) =>
            prev.map((p, i) =>
              i === photoIndex ? { ...p, handle: updatedHandle, moved: true } : p,
            ),
          );
        } else {
          await writeFileTo(targetDirHandle, createdName, photo.file);
        }

        const operation: SortOperation = {
          photoName: photo.name,
          folderId,
          folderName: folder.name,
          mode: moveMode,
          success: true,
          timestamp: Date.now(),
        };

        const newSortedPhotos = { ...sortedPhotos, [photo.key]: folderId };
        const newIndex = Math.min(photoIndex + 1, photos.length - 1);

        setSortedPhotos(newSortedPhotos);
        setOperations((prev) => [...prev, operation]);
        setUndoStack((prev) => [
          ...prev.slice(-19),
          { photoKey: photo.key, photoName: photo.name, createdName, folderId, mode: moveMode, photoIndex },
        ]);
        setCurrentIndex(newIndex);
        setError(null);

        await updateDatabaseAfterOperation(rootHandle, {
          sortedPhotos: newSortedPhotos,
          currentIndex: newIndex,
          operation,
          totalPhotos: photos.length,
          sortedCount: Object.keys(newSortedPhotos).length,
        });

        addStatus({
          type: "success",
          message: `${photo.name} berhasil di${moveMode === "cut" ? "pindahkan" : "copy"}`,
          icon: "file",
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        const failedOp: SortOperation = {
          photoName: photo.name,
          folderId,
          folderName: folder.name,
          mode: moveMode,
          success: false,
          error: errorMsg,
          timestamp: Date.now(),
        };
        setOperations((prev) => [...prev, failedOp]);
        setError(`Gagal memindahkan ${photo.name}: ${errorMsg}`);
        addStatus({
          type: "error",
          message: `Gagal ${moveMode === "cut" ? "memindahkan" : "mengcopy"} ${photo.name}`,
          icon: "file",
        });

        await updateDatabaseAfterOperation(rootHandle, {
          sortedPhotos,
          currentIndex,
          operation: failedOp,
          totalPhotos: photos.length,
          sortedCount: Object.keys(sortedPhotos).length,
        });
      } finally {
        clearStatus();
      }
    },
    [photos, folders, moveMode, sortedPhotos, currentIndex],
  );

  const undoLastOperation = useCallback(async () => {
    const entry = undoStack[undoStack.length - 1];
    const rootHandle = rootDirHandleRef.current;
    if (!entry || !rootHandle) return;

    const folder = folders.find((f) => f.id === entry.folderId);
    const targetDir =
      folder?.dirHandle || folderDirHandlesRef.current.get(entry.folderId);
    if (!targetDir) {
      setError("Tidak bisa undo: folder target tidak ditemukan");
      return;
    }

    addStatus({ type: "loading", message: "Membatalkan operasi...", icon: "file" });

    try {
      if (entry.mode === "cut") {
        // Move the file back to the root folder.
        const movedHandle = await targetDir.getFileHandle(entry.createdName);
        await moveFileHandle(
          movedHandle,
          rootHandle,
          entry.photoName,
          targetDir,
          entry.createdName,
        );
        const restoredHandle = await rootHandle.getFileHandle(entry.photoName);
        setPhotos((prev) =>
          prev.map((p) =>
            p.key === entry.photoKey
              ? { ...p, handle: restoredHandle, moved: false }
              : p,
          ),
        );
      } else {
        // Copy mode: just delete the duplicate that was created.
        await targetDir.removeEntry(entry.createdName);
      }

      const newSortedPhotos = { ...sortedPhotos };
      delete newSortedPhotos[entry.photoKey];

      setSortedPhotos(newSortedPhotos);
      setUndoStack((prev) => prev.slice(0, -1));
      setCurrentIndex(Math.min(entry.photoIndex, Math.max(photos.length - 1, 0)));
      setError(null);

      await updateDatabaseAfterOperation(rootHandle, {
        sortedPhotos: newSortedPhotos,
        currentIndex: entry.photoIndex,
        totalPhotos: photos.length,
        sortedCount: Object.keys(newSortedPhotos).length,
      });

      addStatus({
        type: "success",
        message: `Dibatalkan: ${entry.photoName}`,
        icon: "file",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Gagal undo: ${msg}`);
      addStatus({ type: "error", message: "Gagal membatalkan operasi", icon: "file" });
    } finally {
      clearStatus();
    }
  }, [undoStack, folders, sortedPhotos, photos.length]);

  const navigatePhoto = useCallback(
    (direction: NavigationDirection) => {
      if (direction === "next") {
        setCurrentIndex((prev) => Math.min(prev + 1, photos.length - 1));
      } else if (direction === "prev") {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      }
    },
    [photos.length],
  );

  const jumpToNextUnsorted = useCallback(() => {
    const n = photos.length;
    if (n === 0) return;
    for (let offset = 1; offset <= n; offset++) {
      const i = (currentIndex + offset) % n;
      const p = photos[i];
      if (p && !sortedPhotos[p.key]) {
        setCurrentIndex(i);
        return;
      }
    }
  }, [photos, currentIndex, sortedPhotos]);

  // Recreate a photo's object URL after an <img> load error. A fresh URL forces
  // the browser to re-fetch/re-decode (some large images fail the first decode).
  const recreatePreviewUrl = useCallback((photoKey: string) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.key !== photoKey || !p.url) return p;
        URL.revokeObjectURL(p.url);
        return { ...p, url: URL.createObjectURL(p.file) };
      }),
    );
  }, []);

  const setMoveMode = useCallback(async (mode: MoveMode) => {
    setMoveModeState(mode);
    const rootHandle = rootDirHandleRef.current;
    if (rootHandle) {
      await updateDatabaseMode(rootHandle, mode);
    }
  }, []);

  const getCurrentPhoto = useCallback((): PhotoFile | null => {
    return photos[currentIndex] ?? null;
  }, [photos, currentIndex]);

  const getCurrentFolder = useCallback((): SortFolder | null => {
    const photo = photos[currentIndex];
    if (!photo) return null;
    const folderId = sortedPhotos[photo.key];
    if (!folderId) return null;
    return folders.find((f) => f.id === folderId) ?? null;
  }, [photos, sortedPhotos, currentIndex, folders]);

  const getOperationStats = useCallback(() => {
    const success = operations.filter((o) => o.success).length;
    return {
      success,
      failed: operations.length - success,
      total: operations.length,
    };
  }, [operations]);

  return {
    photos,
    currentIndex,
    folders,
    sortedPhotos,
    isLoading,
    error,
    moveMode,
    operations,
    rawPreviewUrls,
    isDecodingRaw,
    metadataByKey,
    canUndo: undoStack.length > 0,
    loadDirectory,
    addFolder,
    removeFolder,
    assignPhotoToFolder,
    undoLastOperation,
    navigatePhoto,
    jumpToNextUnsorted,
    recreatePreviewUrl,
    setMoveMode,
    getCurrentPhoto,
    getCurrentFolder,
    getOperationStats,
  };
};

export default useFileSystem;
