import LibRaw from "libraw-wasm";

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
const MAX_FULL_DECODE_BYTES = 80 * 1024 * 1024; // 80 MB

// An embedded preview at least this wide is considered sharp enough to display
// directly; anything smaller is a thumbnail, so we prefer a libraw decode.
const SHARP_PREVIEW_MIN_WIDTH = 1000;

// Ignore absurdly long "JPEG" candidates — a real embedded preview is never
// this big, so a longer span means the boundary scan ran into RAW sensor data.
const MAX_CANDIDATE_BYTES = 40 * 1024 * 1024; // 40 MB

/**
 * Decode a RAW file to a URL the browser can display.
 */
export const decodeRawImage = async (file: File): Promise<string | null> => {
  try {
    const embedded = await extractEmbeddedPreview(file);

    // A large, *validated* embedded preview is sharp and fast — prefer it.
    if (embedded && embedded.width >= SHARP_PREVIEW_MIN_WIDTH) {
      return embedded.url;
    }

    // Otherwise decode the sensor data for a high-quality result.
    if (file.size <= MAX_FULL_DECODE_BYTES) {
      const full = await decodeWithLibRaw(file);
      if (full) {
        if (embedded) URL.revokeObjectURL(embedded.url);
        return full;
      }
    }

    // Last resort: whatever (validated) embedded preview we found, even if small.
    return embedded?.url ?? null;
  } catch {
    return null;
  }
};

/**
 * Decode RAW sensor data using libraw-wasm.
 */
const decodeWithLibRaw = async (file: File): Promise<string | null> => {
  try {
    const raw = new LibRaw();
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    await raw.open(fileBuffer, {
      useCameraWb: true,
      userQual: 3, // AHD interpolation
      halfSize: false, // full resolution for a crisp preview
      outputColor: 1, // sRGB
      outputBps: 8,
      noAutoBright: false,
    });

    const meta = await raw.metadata();
    const imageDataResult = await raw.imageData();

    const imageData = imageDataResult?.data;
    const width = imageDataResult?.width || meta.width || 0;
    const height = imageDataResult?.height || meta.height || 0;

    if (
      !imageData ||
      !(imageData instanceof Uint8Array) ||
      imageData.length === 0
    ) {
      return null;
    }

    if (checkIfAllWhite(imageData)) return null;

    return rgbToDataUrl(imageData, width, height);
  } catch {
    return null;
  }
};

/**
 * Find every embedded JPEG (SOI..EOI) in the file, then return the LARGEST one
 * that actually decodes. Each candidate is validated with createImageBitmap, so
 * a mis-parsed/corrupt span is never served as a broken preview — we just move
 * on to the next candidate (and ultimately to a libraw decode).
 */
const extractEmbeddedPreview = async (
  file: File,
): Promise<{ url: string; width: number } | null> => {
  try {
    const data = new Uint8Array(await file.arrayBuffer());

    const candidates: { start: number; end: number; len: number }[] = [];
    for (let i = 0; i + 2 < data.length; i++) {
      // A real JPEG starts with SOI (0xFFD8) immediately followed by a marker.
      if (data[i] === 0xff && data[i + 1] === 0xd8 && data[i + 2] === 0xff) {
        const end = findJpegEoi(data, i);
        if (end > i) {
          const len = end + 2 - i;
          if (len <= MAX_CANDIDATE_BYTES) candidates.push({ start: i, end, len });
          i = end + 1; // continue scanning after this JPEG
        }
      }
    }

    if (candidates.length === 0) return null;

    // Try the largest few candidates; the first that genuinely decodes wins.
    candidates.sort((a, b) => b.len - a.len);

    for (const c of candidates.slice(0, 5)) {
      const bytes = data.slice(c.start, c.end + 2);
      const blob = new Blob([bytes], { type: "image/jpeg" });

      if (typeof createImageBitmap !== "function") {
        // No validation available — trust the largest candidate.
        return { url: URL.createObjectURL(blob), width: Number.MAX_SAFE_INTEGER };
      }

      try {
        const bitmap = await createImageBitmap(blob);
        const width = bitmap.width;
        bitmap.close();
        return { url: URL.createObjectURL(blob), width };
      } catch {
        // Corrupt / undecodable candidate — try the next one.
      }
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Convert RGB(A)/grayscale pixel data to a data URL via Canvas.
 */
const rgbToDataUrl = (
  pixelData: Uint8Array,
  width: number,
  height: number,
): string | null => {
  try {
    if (width <= 0 || height <= 0) return null;
    const pixelCount = width * height;

    // libraw may emit 1 (grayscale), 3 (RGB) or 4 (RGBA) channels.
    const channels = Math.max(1, Math.round(pixelData.length / pixelCount));
    if (channels < 1 || channels > 4) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const imageData = ctx.createImageData(width, height);
    const out = imageData.data;
    const maxSrc = Math.min(pixelData.length, pixelCount * channels);

    for (let s = 0, d = 0; s < maxSrc; s += channels, d += 4) {
      if (channels >= 3) {
        out[d] = pixelData[s];
        out[d + 1] = pixelData[s + 1];
        out[d + 2] = pixelData[s + 2];
        out[d + 3] = channels === 4 ? pixelData[s + 3] : 255;
      } else {
        const v = pixelData[s];
        out[d] = v;
        out[d + 1] = v;
        out[d + 2] = v;
        out[d + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return null;
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Find the End-Of-Image (0xFFD9) for the JPEG starting at `start` (an SOI).
 * Walks the JPEG segment structure so a 0xFFD9 byte pair *inside* compressed
 * scan data is not mistaken for the real EOI (which truncates the preview).
 */
const findJpegEoi = (data: Uint8Array, start: number): number => {
  const n = data.length;
  let i = start + 2;

  while (i < n - 1) {
    // Bound the scan: a real embedded preview never spans this far.
    if (i - start > MAX_CANDIDATE_BYTES) return -1;
    if (data[i] !== 0xff) {
      i++;
      continue;
    }

    let marker = data[i + 1];
    // Skip fill bytes (0xFF 0xFF ...).
    while (marker === 0xff && i + 2 < n) {
      i++;
      marker = data[i + 1];
    }

    if (marker === 0xd9) return i; // EOI
    if (marker === 0x00 || marker === 0x01) {
      i += 2; // stuffed byte / TEM — no payload
      continue;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      i += 2; // RSTn restart markers — no payload
      continue;
    }

    if (i + 3 >= n) return -1;
    const len = (data[i + 2] << 8) | data[i + 3];
    if (len < 2) return -1;

    if (marker === 0xda) {
      // Start Of Scan: skip the header, then scan entropy-coded data until the
      // next real marker (ignoring stuffed 0xFF00 and RSTn markers).
      i += 2 + len;
      while (i < n - 1) {
        if (data[i] === 0xff) {
          const m = data[i + 1];
          if (m !== 0x00 && !(m >= 0xd0 && m <= 0xd7)) break;
        }
        i++;
      }
    } else {
      i += 2 + len;
    }
  }

  return -1;
};

/**
 * Check whether the decoded RGB data is essentially all white (255) — a sign
 * that the libraw decode failed. Samples are spread across the whole buffer.
 */
const checkIfAllWhite = (data: Uint8Array): boolean => {
  if (data.length === 0) return true;
  const samples = 2000;
  const step = Math.max(1, Math.floor(data.length / samples));
  let whiteCount = 0;
  let checked = 0;
  for (let i = 0; i < data.length; i += step) {
    if (data[i] === 255) whiteCount++;
    checked++;
  }
  return checked > 0 && whiteCount / checked > 0.95;
};
