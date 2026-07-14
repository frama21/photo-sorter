import { addStatus, clearStatus } from "@/stores/statusStore"

import type { ProjectState, SortFolder, SortedMapping, MoveMode, SortOperation, PhotoMetadata } from "@/types"

const DB_FILENAME = "photo-sorter-db.json"
// Bumped to 2.0: sortedPhotos is now keyed by file name (not array index) and
// SortOperation is a slim, handle-free record. Older 1.0 databases are not
// compatible and will start fresh (with a visible warning).
const DB_VERSION = "2.0"

const MAX_OPERATIONS = 50

// The database file lives inside the user's chosen folder, so it is untrusted
// input: it may be corrupt, or crafted by whoever can write to that folder.
// These guard against prototype pollution and unbounded-memory when the file
// is read back in.
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"])
const MAX_SORTED_ENTRIES = 100_000
const MAX_METADATA_ENTRIES = 100_000
const MAX_FOLDERS = 1_000

// ============================================================
// PROJECT DATABASE SERVICE
// Auto-create & auto-update JSON database in project folder
// ============================================================

export interface CompleteProjectState extends ProjectState {
  operations: SortOperation[]
  /** Cached, per-file metadata so it isn't re-extracted on every reload. */
  metadataCache?: Record<string, PhotoMetadata>
  stats: {
    totalPhotos: number
    sortedCount: number
    successOperations: number
    failedOperations: number
  }
}

// ------------------------------------------------------------
// Write serialization
// Every mutation is a read-modify-write of the same JSON file. Running them
// concurrently (e.g. holding down a shortcut key) interleaves reads and writes
// and silently drops updates. Funnel all writes through a single promise chain
// so they execute strictly one at a time.
// ------------------------------------------------------------
let writeChain: Promise<unknown> = Promise.resolve()

const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
  const run = writeChain.then(task, task)
  // Keep the chain alive even if a task rejects.
  writeChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

/**
 * Initialize or load project database.
 * - If the DB exists and is valid: load and return it.
 * - Otherwise: create a fresh database file.
 */
export const initProjectDatabase = async (dirHandle: FileSystemDirectoryHandle): Promise<CompleteProjectState> =>
  enqueue(async () => {
    const existing = await loadProjectState(dirHandle)
    if (existing) {
      addStatus({ type: "success", message: "Project dimuat", icon: "db" })
      return existing
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
        failedOperations: 0
      },
      timestamp: Date.now()
    }

    await writeDatabaseFile(dirHandle, freshState)
    addStatus({
      type: "success",
      message: "Database project baru dibuat",
      icon: "db"
    })
    return freshState
  })

/**
 * Shared read-modify-write for every DB mutation. Loads the current state,
 * applies `patch`, and persists it — all inside the single write queue.
 * `timestamp` is refreshed automatically. On failure it always logs, and when
 * `errorMessage` is provided it surfaces a status toast (and clears the loading
 * toast); omitting `errorMessage` means "fail silently" — used by the debounced
 * metadata-cache write so a transient error never spams the user.
 */
const mutateDatabase = async (
  dirHandle: FileSystemDirectoryHandle,
  patch: (current: CompleteProjectState) => Partial<CompleteProjectState>,
  errorMessage?: string
): Promise<void> =>
  enqueue(async () => {
    try {
      const current = await loadProjectState(dirHandle)
      if (!current) return
      await writeDatabaseFile(dirHandle, {
        ...current,
        ...patch(current),
        timestamp: Date.now()
      })
    } catch (err) {
      if (errorMessage) {
        addStatus({ type: "error", message: errorMessage, icon: "db" })
      }
      console.error("[DB] update failed:", err)
    } finally {
      if (errorMessage) clearStatus()
    }
  })

/**
 * Update database after a single sort operation.
 */
export const updateDatabaseAfterOperation = async (
  dirHandle: FileSystemDirectoryHandle,
  update: {
    sortedPhotos: SortedMapping
    currentIndex: number
    /** Omit to persist a mapping change (e.g. undo) without logging a sort. */
    operation?: SortOperation
    totalPhotos: number
    sortedCount: number
  }
): Promise<void> =>
  mutateDatabase(
    dirHandle,
    current => {
      const operations = (update.operation ? [...current.operations, update.operation] : current.operations).slice(
        -MAX_OPERATIONS
      )
      const successOps = operations.filter(o => o.success).length
      return {
        sortedPhotos: update.sortedPhotos,
        currentIndex: update.currentIndex,
        operations,
        stats: {
          totalPhotos: update.totalPhotos,
          sortedCount: update.sortedCount,
          successOperations: successOps,
          failedOperations: operations.length - successOps
        }
      }
    },
    "Gagal menyimpan data"
  )

/**
 * Update database after folder change (add/remove).
 */
export const updateDatabaseFolders = async (
  dirHandle: FileSystemDirectoryHandle,
  folders: SortFolder[]
): Promise<void> =>
  mutateDatabase(
    dirHandle,
    () => ({
      folders: folders.map(f => ({
        id: f.id,
        name: f.name,
        shortcut: f.shortcut,
        color: f.color,
        createdAt: f.createdAt
      }))
    }),
    "Gagal update folder"
  )

/**
 * Update database after mode change.
 */
export const updateDatabaseMode = async (
  dirHandle: FileSystemDirectoryHandle,
  moveMode: MoveMode
): Promise<void> => mutateDatabase(dirHandle, () => ({ moveMode }), "Gagal update mode")

/**
 * Persist the lazily-extracted metadata cache (debounced by the caller).
 */
export const updateDatabaseMetadata = async (
  dirHandle: FileSystemDirectoryHandle,
  metadataCache: Record<string, PhotoMetadata>
): Promise<void> => mutateDatabase(dirHandle, () => ({ metadataCache }))

// ============================================================
// INTERNAL HELPERS
// ============================================================

const isValidState = (state: unknown): state is CompleteProjectState => {
  if (!state || typeof state !== "object") return false
  const s = state as Record<string, unknown>
  return (
    typeof s.version === "string" &&
    Array.isArray(s.folders) &&
    typeof s.sortedPhotos === "object" &&
    s.sortedPhotos !== null &&
    Array.isArray(s.operations)
  )
}

/**
 * Copy a plain string-keyed record into a fresh null-prototype object, dropping
 * prototype-polluting keys and any value that fails `valueOk`, capped at `max`
 * entries.
 */
const safeRecord = <T>(input: unknown, valueOk: (v: unknown) => v is T, max: number): Record<string, T> => {
  const out: Record<string, T> = Object.create(null)
  if (!input || typeof input !== "object") return out
  let n = 0
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(k)) continue
    if (!valueOk(v)) continue
    out[k] = v
    if (++n >= max) break
  }
  return out
}

/**
 * Normalize a validated-but-untrusted project state: strip pollution vectors,
 * bound every collection, and coerce scalar fields to safe defaults. Runs on
 * every load so nothing downstream has to re-check the file's contents.
 */
const sanitizeState = (s: CompleteProjectState): CompleteProjectState => ({
  ...s,
  folders: (Array.isArray(s.folders) ? s.folders : [])
    .filter(
      f =>
        !!f &&
        typeof f === "object" &&
        typeof (f as { id?: unknown }).id === "string" &&
        typeof (f as { name?: unknown }).name === "string"
    )
    .slice(0, MAX_FOLDERS),
  sortedPhotos: safeRecord(s.sortedPhotos, (v): v is string => typeof v === "string", MAX_SORTED_ENTRIES),
  operations: (Array.isArray(s.operations) ? s.operations : []).slice(-MAX_OPERATIONS),
  metadataCache: safeRecord(
    s.metadataCache,
    (v): v is PhotoMetadata => !!v && typeof v === "object",
    MAX_METADATA_ENTRIES
  ),
  moveMode: s.moveMode === "cut" ? "cut" : "copy",
  currentIndex: Number.isFinite(s.currentIndex) && s.currentIndex >= 0 ? Math.floor(s.currentIndex) : 0
})

/**
 * Load project state from database file. Returns null (and warns the user) for
 * a missing, corrupt, or incompatible-version file — never throws.
 */
const loadProjectState = async (dirHandle: FileSystemDirectoryHandle): Promise<CompleteProjectState | null> => {
  let content: string
  try {
    const fileHandle = await dirHandle.getFileHandle(DB_FILENAME)
    const file = await fileHandle.getFile()
    content = await file.text()
  } catch {
    // No database yet — normal on first open.
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (err) {
    addStatus({
      type: "error",
      message: "Database rusak, dibuat ulang",
      icon: "db"
    })
    console.error("[DB] Corrupt JSON, ignoring:", err)
    return null
  }

  if (!isValidState(parsed)) {
    addStatus({
      type: "error",
      message: "Format database tidak valid, dibuat ulang",
      icon: "db"
    })
    console.warn("[DB] Invalid state shape, ignoring")
    return null
  }

  if (parsed.version !== DB_VERSION) {
    addStatus({
      type: "error",
      message: `Database versi ${parsed.version} tidak kompatibel, dibuat ulang`,
      icon: "db"
    })
    console.warn(`[DB] Version mismatch (${parsed.version} != ${DB_VERSION}), resetting`)
    return null
  }

  return sanitizeState(parsed)
}

const writeDatabaseFile = async (
  dirHandle: FileSystemDirectoryHandle,
  state: CompleteProjectState
): Promise<void> => {
  const fileHandle = await dirHandle.getFileHandle(DB_FILENAME, {
    create: true
  })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(state, null, 2))
  await writable.close()
}
