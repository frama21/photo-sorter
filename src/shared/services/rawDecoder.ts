import LibRaw from "libraw-wasm"

/**
 * ============================================================
 * RAW IMAGE DECODER SERVICE
 *
 * Strategy (quality first):
 * 1. Extract the LARGEST embedded JPEG preview from the RAW. Most cameras embed
 *    a full / near-full resolution JPEG preview — it is both fast AND sharp.
 *    (The first/smallest embedded JPEG is a tiny thumbnail and looks pixelated,
 *    so we must pick the biggest one.)
 * 2. If there is no decently-sized embedded preview, fall back to a libraw-wasm
 *    decode of the actual sensor data.
 * 3. Convert to a blob/data URL for display.
 * ============================================================
 */

// Full libraw decode allocates the whole file + an RGB buffer + a canvas.
// Above this size we skip the expensive path and rely on the embedded preview.
const MAX_FULL_DECODE_BYTES = 80 * 1024 * 1024 // 80 MB

// An embedded preview at least this wide is considered sharp enough to display
// directly; anything smaller is a thumbnail, so we prefer a libraw decode.
// Kept modest so we use the (reliable) embedded preview for almost every RAW
// and only fall back to the flaky libraw worker when there's truly no preview.
const SHARP_PREVIEW_MIN_WIDTH = 800

// Ignore absurdly long "JPEG" candidates — a real embedded preview is never
// this big, so a longer span means the boundary scan ran into RAW sensor data.
const MAX_CANDIDATE_BYTES = 40 * 1024 * 1024 // 40 MB

// Cap the cached preview's longest side. The embedded preview slice can run to
// end-of-file, so we re-encode the decoded bitmap to a small JPEG instead of
// caching tens of MB per RAW.
const MAX_PREVIEW_DIM = 2048

// Longest side for RAW *thumbnails* (filmstrip/grid) — small and memory-cheap.
const RAW_THUMB_DIM = 512

// Hard ceiling for a single libraw decode so a dead/stuck worker can't hang the
// RAW preview forever.
const LIBRAW_TIMEOUT_MS = 20000

/**
 * libraw-wasm (through at least 1.4.0) ships a broken worker message handler: it
 * reads the promise rejecter from `.throw`, but `runFn` stores it under
 * `.error`. So any worker error throws "n is not a function" inside onmessage
 * and leaves the decode promise pending forever (the RAW spinner hangs).
 * Re-bind the handler to the correct keys, and reject on worker errors, so the
 * promise always settles.
 */
const patchLibRawWorker = (raw: unknown): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = raw as any
  const worker: Worker | undefined = r?.worker
  if (!worker) return

  worker.onmessage = ({ data }: MessageEvent) => {
    const pending = r.waitForWorker
    if (!pending) return
    r.waitForWorker = false
    if (data?.error) pending.error(data.error)
    else pending.return(data?.out)
  }
  worker.onerror = (event: ErrorEvent) => {
    const pending = r.waitForWorker
    if (!pending) return
    r.waitForWorker = false
    pending.error(event?.message || "libraw worker error")
  }
}

/** Reject if a promise doesn't settle within `ms`. */
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("libraw decode timed out")), ms)
    promise.then(
      value => {
        clearTimeout(id)
        resolve(value)
      },
      err => {
        clearTimeout(id)
        reject(err)
      }
    )
  })

/**
 * Read the *real* pixel dimensions of a RAW file.
 *
 * ExifReader (and most EXIF libs) return the dimensions of the tiny embedded
 * thumbnail IFD for RAW formats — e.g. a Nikon NEF reports 160×120 — because the
 * true sensor size lives in a SubIFD they don't chase.
 *
 * Instead we read the intrinsic size of the *largest embedded JPEG preview*,
 * which every camera writes at (essentially) full resolution. This is a pure
 * `createImageBitmap` decode with NO libraw worker, so it never contends with an
 * in-flight RAW preview decode — the reason a worker-based read was unreliable
 * when a photo was opened (decode + dimensions racing for the same wasm worker).
 *
 * Returns null if the RAW has no decodable embedded JPEG.
 */
export const getRawDimensions = async (file: File): Promise<{ width: number; height: number } | null> => {
  try {
    if (typeof createImageBitmap !== "function") return null
    const data = new Uint8Array(await file.arrayBuffer())

    // Collect SOI offsets (a JPEG starts with FF D8 FF ...).
    const sois: number[] = []
    for (let i = 0; i + 2 < data.length; i++) {
      if (data[i] === 0xff && data[i + 1] === 0xd8 && data[i + 2] === 0xff) sois.push(i)
    }
    if (sois.length === 0) return null

    // Largest byte-spans first — the full-res preview is the biggest JPEG.
    const candidates = sois
      .map((start, idx) => {
        const next = idx + 1 < sois.length ? sois[idx + 1] : data.length
        return { start, end: Math.min(next, start + MAX_CANDIDATE_BYTES) }
      })
      .sort((a, b) => b.end - b.start - (a.end - a.start))

    // Return the embedded JPEG with the largest area that actually decodes.
    let best: { width: number; height: number } | null = null
    for (const c of candidates.slice(0, 6)) {
      const blob = new Blob([data.slice(c.start, c.end)], { type: "image/jpeg" })
      try {
        const bitmap = await createImageBitmap(blob)
        const { width, height } = bitmap
        bitmap.close()
        if (!best || width * height > best.width * best.height) best = { width, height }
      } catch {
        // Not a decodable JPEG at this offset — skip.
      }
    }
    return best
  } catch {
    return null
  }
}

/**
 * Decode a RAW file to a URL the browser can display.
 */
export const decodeRawImage = async (file: File): Promise<string | null> => {
  try {
    const embedded = await extractEmbeddedPreview(file)

    // A large, *validated* embedded preview is sharp and fast — prefer it.
    if (embedded && embedded.width >= SHARP_PREVIEW_MIN_WIDTH) {
      return embedded.url
    }

    // Otherwise decode the sensor data for a high-quality result.
    if (file.size <= MAX_FULL_DECODE_BYTES) {
      const full = await decodeWithLibRaw(file)
      if (full) {
        if (embedded) URL.revokeObjectURL(embedded.url)
        return full
      }
    }

    // Last resort: whatever (validated) embedded preview we found, even if small.
    return embedded?.url ?? null
  } catch {
    return null
  }
}

/**
 * Fast, worker-free RAW thumbnail for the filmstrip/grid: extract the largest
 * embedded JPEG preview and re-encode it small. Skips the slow/flaky libraw
 * sensor decode entirely, so many thumbnails can be decoded in the background.
 * Returns null when the RAW has no embedded preview.
 */
export const decodeRawThumbnail = async (file: File): Promise<string | null> => {
  try {
    const embedded = await extractEmbeddedPreview(file, RAW_THUMB_DIM)
    return embedded?.url ?? null
  } catch {
    return null
  }
}

/**
 * Extract the camera's embedded thumbnail/preview via LibRaw. This works across
 * RAW formats (JPEG or bitmap previews) even when the raw byte-scan finds
 * nothing, and it's cheap — no demosaicing of the full sensor.
 */
const libRawThumbnail = async (raw: InstanceType<typeof LibRaw>): Promise<string | null> => {
  try {
    const thumb = await withTimeout(raw.thumbnailData(), LIBRAW_TIMEOUT_MS)
    if (!thumb) return null
    const bytes = thumb.data
    if (!bytes || !(bytes instanceof Uint8Array) || bytes.length === 0) {
      return null
    }
    // Most embedded thumbnails are a complete JPEG file.
    if (thumb.format === "jpeg" || (bytes[0] === 0xff && bytes[1] === 0xd8)) {
      // Copy into a fresh Uint8Array so the Blob part is ArrayBuffer-backed.
      return URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }))
    }
    // Otherwise it's a raw RGB bitmap.
    return rgbToDataUrl(bytes, thumb.width, thumb.height)
  } catch {
    return null
  }
}

/**
 * Decode a RAW with libraw-wasm. Tries the embedded thumbnail/preview first
 * (fast & reliable), then falls back to a full sensor decode.
 */
const decodeWithLibRaw = async (file: File): Promise<string | null> => {
  let raw: InstanceType<typeof LibRaw> | null = null
  try {
    raw = new LibRaw()
    patchLibRawWorker(raw) // work around the upstream hang-on-error bug

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    await withTimeout(
      raw.open(fileBuffer, {
        useCameraWb: true,
        userQual: 3, // AHD interpolation
        halfSize: true, // half-res is fast & memory-safe; embedded JPEG covers sharpness
        outputColor: 1, // sRGB
        outputBps: 8,
        noAutoBright: false
      }),
      LIBRAW_TIMEOUT_MS
    )

    // 1) Fast, reliable path: the camera's embedded thumbnail/preview.
    const thumb = await libRawThumbnail(raw)
    if (thumb) return thumb

    // 2) Last resort: decode the actual sensor data.
    const meta = await withTimeout(raw.metadata(), LIBRAW_TIMEOUT_MS).catch(() => null)
    const imageDataResult = await withTimeout(raw.imageData(), LIBRAW_TIMEOUT_MS)

    const imageData = imageDataResult?.data
    const width = imageDataResult?.width || meta?.width || 0
    const height = imageDataResult?.height || meta?.height || 0

    if (!imageData || !(imageData instanceof Uint8Array) || imageData.length === 0) {
      return null
    }

    if (checkIfAllWhite(imageData)) return null

    return rgbToDataUrl(imageData, width, height)
  } catch {
    return null
  } finally {
    // libraw spawns one worker per instance — terminate it so decoding many
    // RAW files doesn't accumulate workers.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(raw as any)?.worker?.terminate?.()
    } catch {
      /* ignore */
    }
  }
}

/**
 * Re-encode a decoded bitmap to a small, bounded JPEG data URL so we never cache
 * the original (possibly tens-of-MB) source slice.
 */
const bitmapToDataUrl = (bitmap: ImageBitmap, maxDim = MAX_PREVIEW_DIM): string | null => {
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, w, h)
    return canvas.toDataURL("image/jpeg", 0.9)
  } catch {
    return null
  }
}

/**
 * Find the embedded JPEG previews in a RAW file and return the one with the
 * largest *decoded* width. Each candidate is sliced from its SOI marker
 * (0xFFD8FF) to the next SOI (or end of file) and handed to the JPEG decoder,
 * which finds the real EOI itself and ignores trailing bytes. This avoids
 * truncating the preview — the failure mode of a hand-rolled EOI scan on formats
 * like Sony ARW. Only candidates that actually decode are returned.
 */
const extractEmbeddedPreview = async (
  file: File,
  maxDim = MAX_PREVIEW_DIM
): Promise<{ url: string; width: number } | null> => {
  try {
    const data = new Uint8Array(await file.arrayBuffer())

    // Collect SOI offsets (a JPEG starts with FF D8 FF ...).
    const sois: number[] = []
    for (let i = 0; i + 2 < data.length; i++) {
      if (data[i] === 0xff && data[i + 1] === 0xd8 && data[i + 2] === 0xff) {
        sois.push(i)
      }
    }
    if (sois.length === 0) return null

    // Each candidate spans from its SOI to the next SOI (or EOF), capped. Larger
    // spans are more likely to hold the full preview, so try those first.
    const candidates = sois
      .map((start, idx) => {
        const next = idx + 1 < sois.length ? sois[idx + 1] : data.length
        return { start, end: Math.min(next, start + MAX_CANDIDATE_BYTES) }
      })
      .sort((a, b) => b.end - b.start - (a.end - a.start))

    if (typeof createImageBitmap !== "function") {
      // No validation available — trust the largest candidate.
      const c = candidates[0]
      const blob = new Blob([data.slice(c.start, c.end)], { type: "image/jpeg" })
      return { url: URL.createObjectURL(blob), width: Number.MAX_SAFE_INTEGER }
    }

    let best: { url: string; width: number } | null = null
    for (const c of candidates.slice(0, 6)) {
      const blob = new Blob([data.slice(c.start, c.end)], { type: "image/jpeg" })
      try {
        const bitmap = await createImageBitmap(blob)
        const width = bitmap.width
        if (!best || width > best.width) {
          // Re-encode to a small JPEG so we don't cache the giant source slice.
          const url = bitmapToDataUrl(bitmap, maxDim)
          bitmap.close()
          if (url) best = { url, width }
        } else {
          bitmap.close()
        }
      } catch {
        // Not a decodable JPEG at this offset — skip.
      }
    }

    return best
  } catch {
    return null
  }
}

/**
 * Convert RGB(A)/grayscale pixel data to a data URL via Canvas.
 */
const rgbToDataUrl = (pixelData: Uint8Array, width: number, height: number): string | null => {
  try {
    if (width <= 0 || height <= 0) return null
    const pixelCount = width * height

    // libraw may emit 1 (grayscale), 3 (RGB) or 4 (RGBA) channels.
    const channels = Math.max(1, Math.round(pixelData.length / pixelCount))
    if (channels < 1 || channels > 4) return null

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    const imageData = ctx.createImageData(width, height)
    const out = imageData.data
    const maxSrc = Math.min(pixelData.length, pixelCount * channels)

    for (let s = 0, d = 0; s < maxSrc; s += channels, d += 4) {
      if (channels >= 3) {
        out[d] = pixelData[s]
        out[d + 1] = pixelData[s + 1]
        out[d + 2] = pixelData[s + 2]
        out[d + 3] = channels === 4 ? pixelData[s + 3] : 255
      } else {
        const v = pixelData[s]
        out[d] = v
        out[d + 1] = v
        out[d + 2] = v
        out[d + 3] = 255
      }
    }

    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL("image/jpeg", 0.92)
  } catch {
    return null
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check whether the decoded RGB data is essentially all white (255) — a sign
 * that the libraw decode failed. Samples are spread across the whole buffer.
 */
const checkIfAllWhite = (data: Uint8Array): boolean => {
  if (data.length === 0) return true
  const samples = 2000
  const step = Math.max(1, Math.floor(data.length / samples))
  let whiteCount = 0
  let checked = 0
  for (let i = 0; i < data.length; i += step) {
    if (data[i] === 255) whiteCount++
    checked++
  }
  return checked > 0 && whiteCount / checked > 0.95
}
