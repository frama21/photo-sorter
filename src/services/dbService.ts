import isEmpty from "lodash.isempty";

import { addStatus, clearStatus } from "@/stores/statusStore";

import type {
  ProjectState,
  SortFolder,
  SortedMapping,
  MoveMode,
  SortOperation,
  PhotoMetadata,
} from "@/types";

const DB_FILENAME = "photo-sorter-db.json";
// Bumped to 2.0: sortedPhotos is now keyed by file name (not array index) and
// SortOperation is a slim, handle-free record. Older 1.0 databases are not
// compatible and will start fresh (with a visible warning).
const DB_VERSION = "2.0";

const MAX_OPERATIONS = 50;

// ============================================================
// PROJECT DATABASE SERVICE
// Auto-create & auto-update JSON database in project folder
// ============================================================

export interface CompleteProjectState extends ProjectState {
  operations: SortOperation[];
  /** Cached, per-file metadata so it isn't re-extracted on every reload. */
  metadataCache?: Record<string, PhotoMetadata>;
  stats: {
    totalPhotos: number;
    sortedCount: number;
    successOperations: number;
    failedOperations: number;
  };
}

// ------------------------------------------------------------
// Write serialization
// Every mutation is a read-modify-write of the same JSON file. Running them
// concurrently (e.g. holding down a shortcut key) interleaves reads and writes
// and silently drops updates. Funnel all writes through a single promise chain
// so they execute strictly one at a time.
// ------------------------------------------------------------
let writeChain: Promise<unknown> = Promise.resolve();

const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
  const run = writeChain.then(task, task);
  // Keep the chain alive even if a task rejects.
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

/**
 * Initialize or load project database.
 * - If the DB exists and is valid: load and return it.
 * - Otherwise: create a fresh database file.
 */
export const initProjectDatabase = async (
  dirHandle: FileSystemDirectoryHandle,
): Promise<CompleteProjectState> =>
  enqueue(async () => {
    const existing = await loadProjectState(dirHandle);
    if (!isEmpty(existing) && existing) {
      addStatus({ type: "success", message: "Project dimuat", icon: "db" });
      return existing;
    }

    const freshState: CompleteProjectState = {
      version: DB_VERSION,
      folders: [],
      sortedPhotos: {},
      moveMode: "copy",
      currentIndex: 0,
      operations: [],
      metadataCache: {},
      stats: {
        totalPhotos: 0,
        sortedCount: 0,
        successOperations: 0,
        failedOperations: 0,
      },
      timestamp: Date.now(),
    };

    await writeDatabaseFile(dirHandle, freshState);
    addStatus({
      type: "success",
      message: "Database project baru dibuat",
      icon: "db",
    });
    return freshState;
  });

/**
 * Update database after a single sort operation.
 */
export const updateDatabaseAfterOperation = async (
  dirHandle: FileSystemDirectoryHandle,
  update: {
    sortedPhotos: SortedMapping;
    currentIndex: number;
    /** Omit to persist a mapping change (e.g. undo) without logging a sort. */
    operation?: SortOperation;
    totalPhotos: number;
    sortedCount: number;
  },
): Promise<void> =>
  enqueue(async () => {
    try {
      const current = await loadProjectState(dirHandle);
      if (!current) return;

      const operations = (
        update.operation
          ? [...current.operations, update.operation]
          : current.operations
      ).slice(-MAX_OPERATIONS);
      const successOps = operations.filter((o) => o.success).length;

      const updated: CompleteProjectState = {
        ...current,
        sortedPhotos: update.sortedPhotos,
        currentIndex: update.currentIndex,
        operations,
        stats: {
          totalPhotos: update.totalPhotos,
          sortedCount: update.sortedCount,
          successOperations: successOps,
          failedOperations: operations.length - successOps,
        },
        timestamp: Date.now(),
      };

      await writeDatabaseFile(dirHandle, updated);
    } catch (err) {
      addStatus({ type: "error", message: "Gagal menyimpan data", icon: "db" });
      console.error("[DB] Failed to update after operation:", err);
    } finally {
      clearStatus();
    }
  });

/**
 * Update database after folder change (add/remove).
 */
export const updateDatabaseFolders = async (
  dirHandle: FileSystemDirectoryHandle,
  folders: SortFolder[],
): Promise<void> =>
  enqueue(async () => {
    try {
      const current = await loadProjectState(dirHandle);
      if (!current) return;

      const updated: CompleteProjectState = {
        ...current,
        folders: folders.map((f) => ({
          id: f.id,
          name: f.name,
          shortcut: f.shortcut,
          color: f.color,
          createdAt: f.createdAt,
        })),
        timestamp: Date.now(),
      };

      await writeDatabaseFile(dirHandle, updated);
    } catch (err) {
      addStatus({ type: "error", message: "Gagal update folder", icon: "db" });
      console.error("[DB] Failed to update folders:", err);
    } finally {
      clearStatus();
    }
  });

/**
 * Update database after mode change.
 */
export const updateDatabaseMode = async (
  dirHandle: FileSystemDirectoryHandle,
  moveMode: MoveMode,
): Promise<void> =>
  enqueue(async () => {
    try {
      const current = await loadProjectState(dirHandle);
      if (!current) return;

      const updated: CompleteProjectState = {
        ...current,
        moveMode,
        timestamp: Date.now(),
      };

      await writeDatabaseFile(dirHandle, updated);
    } catch (err) {
      addStatus({ type: "error", message: "Gagal update mode", icon: "db" });
      console.error("[DB] Failed to update mode:", err);
    } finally {
      clearStatus();
    }
  });

/**
 * Persist the lazily-extracted metadata cache (debounced by the caller).
 */
export const updateDatabaseMetadata = async (
  dirHandle: FileSystemDirectoryHandle,
  metadataCache: Record<string, PhotoMetadata>,
): Promise<void> =>
  enqueue(async () => {
    try {
      const current = await loadProjectState(dirHandle);
      if (!current) return;

      const updated: CompleteProjectState = {
        ...current,
        metadataCache,
        timestamp: Date.now(),
      };

      await writeDatabaseFile(dirHandle, updated);
    } catch (err) {
      console.error("[DB] Failed to update metadata cache:", err);
    }
  });

// ============================================================
// INTERNAL HELPERS
// ============================================================

const isValidState = (state: unknown): state is CompleteProjectState => {
  if (!state || typeof state !== "object") return false;
  const s = state as Record<string, unknown>;
  return (
    typeof s.version === "string" &&
    Array.isArray(s.folders) &&
    typeof s.sortedPhotos === "object" &&
    s.sortedPhotos !== null &&
    Array.isArray(s.operations)
  );
};

/**
 * Load project state from database file. Returns null (and warns the user) for
 * a missing, corrupt, or incompatible-version file — never throws.
 */
export const loadProjectState = async (
  dirHandle: FileSystemDirectoryHandle,
): Promise<CompleteProjectState | null> => {
  let content: string;
  try {
    const fileHandle = await dirHandle.getFileHandle(DB_FILENAME);
    const file = await fileHandle.getFile();
    content = await file.text();
  } catch {
    // No database yet — normal on first open.
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    addStatus({
      type: "error",
      message: "Database rusak, dibuat ulang",
      icon: "db",
    });
    console.error("[DB] Corrupt JSON, ignoring:", err);
    return null;
  }

  if (!isValidState(parsed)) {
    addStatus({
      type: "error",
      message: "Format database tidak valid, dibuat ulang",
      icon: "db",
    });
    console.warn("[DB] Invalid state shape, ignoring");
    return null;
  }

  if (parsed.version !== DB_VERSION) {
    addStatus({
      type: "error",
      message: `Database versi ${parsed.version} tidak kompatibel, dibuat ulang`,
      icon: "db",
    });
    console.warn(
      `[DB] Version mismatch (${parsed.version} != ${DB_VERSION}), resetting`,
    );
    return null;
  }

  return parsed;
};

const writeDatabaseFile = async (
  dirHandle: FileSystemDirectoryHandle,
  state: CompleteProjectState,
): Promise<void> => {
  const fileHandle = await dirHandle.getFileHandle(DB_FILENAME, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(state, null, 2));
  await writable.close();
};
