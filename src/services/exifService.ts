/* eslint-disable @typescript-eslint/no-explicit-any */
import ExifReader from "exifreader";
import mediaInfoFactory from "mediainfo.js";

import type { PhotoMetadata } from "@/types";
import { getFileFormatInfo } from "@/config/fileFormats";

/**
 * Extract metadata dari image (EXIF) atau video (mediainfo.js)
 */
export const extractMetadata = async (file: File): Promise<PhotoMetadata> => {
  const isVideo = getFileFormatInfo(file.name)?.category === "video";
  const defaultMetadata: PhotoMetadata = {
    fileSize: file.size,
    megapixels: 0,
    dimensions: { width: 0, height: 0 },
    isVideo,
  };

  try {
    if (isVideo) {
      return await extractVideoMetadata(file, defaultMetadata);
    } else {
      return await extractImageMetadata(file, defaultMetadata);
    }
  } catch (err) {
    console.warn("Failed to extract metadata:", err);
    return defaultMetadata;
  }
};

// EXIF/metadata lives in the file header, so only read the first chunk instead
// of pulling a potentially huge (RAW/TIFF) file fully into memory.
const MAX_HEADER_BYTES = 2 * 1024 * 1024; // 2 MB

/** First positive number from a value that may be a number, string, or array. */
const toNum = (v: any): number | undefined => {
  if (v == null) return undefined;
  const raw = Array.isArray(v) ? v[0] : v;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** First non-empty trimmed string from the given values. */
const str = (...vals: any[]): string | undefined => {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
};

/** First tag description (ExifReader tags expose a `description` field). */
const desc = (...tags: any[]): string | undefined => {
  for (const t of tags) {
    const d = t?.description;
    if (typeof d === "string" && d.trim() && d.trim() !== "Undefined") {
      return d.trim();
    }
  }
  return undefined;
};

const extractImageMetadata = async (
  file: File,
  base: PhotoMetadata,
): Promise<PhotoMetadata> => {
  const slice =
    file.size > MAX_HEADER_BYTES ? file.slice(0, MAX_HEADER_BYTES) : file;
  const arrayBuffer = await slice.arrayBuffer();
  const tags = await ExifReader.load(arrayBuffer, {
    async: true,
    expanded: true,
  });

  // Cast to any: ExifReader's typings omit several real tag names
  // (PhotographicSensitivity, Lens, LensSpecification, ISOSpeed, ...).
  const exif = (tags.exif || {}) as any;
  const imageInfo = (tags.file || {}) as any;

  const width =
    toNum(imageInfo["Image Width"]?.value) ??
    toNum(exif.PixelXDimension?.value) ??
    toNum(exif.ImageWidth?.value) ??
    0;
  const height =
    toNum(imageInfo["Image Height"]?.value) ??
    toNum(exif.PixelYDimension?.value) ??
    toNum(exif.ImageLength?.value) ??
    0;

  const megapixels =
    width && height ? Math.round(((width * height) / 1000000) * 10) / 10 : 0;

  return {
    ...base,
    cameraMake: desc(exif.Make),
    cameraModel: desc(exif.Model),
    lens: desc(
      exif.LensModel,
      exif.Lens,
      exif.LensSpecification,
      exif.LensMake,
    ),
    iso:
      toNum(exif.ISOSpeedRatings?.value) ??
      toNum(exif.PhotographicSensitivity?.value) ??
      toNum(exif.ISOSpeed?.value),
    shutterSpeed: desc(exif.ExposureTime, exif.ShutterSpeedValue),
    aperture: desc(exif.FNumber, exif.ApertureValue, exif.MaxApertureValue),
    focalLength: desc(exif.FocalLength, exif.FocalLengthIn35mmFilm),
    dateTaken: desc(
      exif.DateTimeOriginal,
      exif.DateTimeDigitized,
      exif.DateTime,
    ),
    megapixels,
    dimensions: { width, height },
  };
};

const extractVideoMetadata = async (
  file: File,
  base: PhotoMetadata,
): Promise<PhotoMetadata> => {
  const mediainfo = await mediaInfoFactory();

  const getSize = () => file.size;

  const readChunk = async (chunkSize: number, offset: number) => {
    return new Uint8Array(
      await file.slice(offset, offset + chunkSize).arrayBuffer(),
    );
  };

  const result = await mediainfo.analyzeData(getSize, readChunk);

  // Result structure: result.media.track[]
  // track[0] = General, track[1] = Video, track[2] = Audio, ...
  const tracks = (result as any)?.media?.track || [];

  const generalTrack = tracks.find((t: any) => t["@type"] === "General");
  const videoTrack = tracks.find((t: any) => t["@type"] === "Video");
  const audioTrack = tracks.find((t: any) => t["@type"] === "Audio");

  // Phone-recorded videos store camera/date in QuickTime "extra" tags; the key
  // naming varies between mediainfo versions, so check both forms.
  const extra = generalTrack?.extra || {};
  const xtra = (...keys: string[]) => str(...keys.map((k) => extra[k]));

  const width = toNum(videoTrack?.Width) ?? 0;
  const height = toNum(videoTrack?.Height) ?? 0;
  const megapixels =
    width && height ? Math.round(((width * height) / 1000000) * 10) / 10 : 0;

  // Duration is reported in seconds by mediainfo.js.
  const duration =
    toNum(generalTrack?.Duration) ?? toNum(videoTrack?.Duration);
  const fps = toNum(videoTrack?.FrameRate);
  const bitrate =
    toNum(generalTrack?.OverallBitRate) ?? toNum(videoTrack?.BitRate);

  const dateTaken = str(
    xtra("com.apple.quicktime.creationdate", "com_apple_quicktime_creationdate"),
    generalTrack?.Encoded_Date,
    generalTrack?.Recorded_Date,
    generalTrack?.Tagged_Date,
    generalTrack?.File_Modified_Date,
  );

  return {
    ...base,
    cameraMake: str(
      xtra("com.apple.quicktime.make", "com_apple_quicktime_make"),
      generalTrack?.Encoded_Hardware_CompanyName,
    ),
    cameraModel: str(
      xtra("com.apple.quicktime.model", "com_apple_quicktime_model"),
      generalTrack?.Model,
      generalTrack?.Encoded_Hardware_Name,
      generalTrack?.Encoded_Application,
      generalTrack?.Writing_Application,
    ),
    dateTaken,
    megapixels,
    dimensions: { width, height },
    duration: duration && duration > 0 ? duration : undefined,
    fps,
    videoCodec: videoTrack?.Format || undefined,
    audioCodec: audioTrack?.Format || undefined,
    bitrate,
  };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

/**
 * Parse the many date shapes that EXIF and mediainfo emit into a Date.
 * Handles: "2023:01:02 13:04:05" (EXIF), "2023-01-02 13:04:05",
 * "UTC 2023-01-02 13:04:05" (mediainfo), ISO 8601 with "T", and date-only.
 * Returns null when unparseable.
 */
const parseFlexibleDate = (raw: string): Date | null => {
  let s = raw.trim();
  if (!s) return null;

  // Strip a leading timezone token like "UTC " that mediainfo prepends.
  s = s.replace(/^[A-Z]{2,4}\s+/, "");

  // Already ISO-ish (has a "T") — let Date handle it directly.
  if (s.includes("T")) {
    const iso = new Date(s);
    if (!isNaN(iso.getTime())) return iso;
  }

  const [datePartRaw, ...timeParts] = s.split(/\s+/);
  // EXIF uses colons in the date ("2023:01:02"); normalize to dashes.
  const datePart = datePartRaw.replace(/:/g, "-");
  const timePart = timeParts.join(" ") || "00:00:00";

  const candidate = new Date(`${datePart}T${timePart}`);
  if (!isNaN(candidate.getTime())) return candidate;

  // Last resort: let the engine try the original string.
  const fallback = new Date(raw);
  return isNaN(fallback.getTime()) ? null : fallback;
};

/**
 * Convert a capture-date string to a timestamp (ms), or null if unparseable.
 * Used to order photos chronologically.
 */
export const parseCaptureDate = (dateStr: string | undefined): number | null => {
  if (!dateStr) return null;
  const d = parseFlexibleDate(dateStr);
  return d ? d.getTime() : null;
};

const formatDateObject = (dateObj: Date): string => {
  const day = String(dateObj.getDate()).padStart(2, "0");
  // Gunakan "id-ID" untuk bahasa Indonesia, ganti "en-US" untuk bahasa Inggris
  const month = dateObj.toLocaleString("id-ID", { month: "short" });
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  return `${day} ${month}, ${year} - ${hours}:${minutes}`;
};

export const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "-";
  const dateObj = parseFlexibleDate(dateStr);
  return dateObj ? formatDateObject(dateObj) : "-";
};

/** Format a millisecond timestamp (e.g. File.lastModified) for display. */
export const formatTimestamp = (ms: number | undefined): string => {
  if (!ms) return "-";
  const d = new Date(ms);
  return isNaN(d.getTime()) ? "-" : formatDateObject(d);
};

/** Format a duration (seconds) as h:mm:ss or m:ss. */
export const formatDuration = (seconds: number | undefined): string => {
  if (!seconds || seconds <= 0) return "-";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/** Format a bitrate (bits per second) as Mbps/kbps. */
export const formatBitrate = (bps: number | undefined): string => {
  if (!bps || bps <= 0) return "-";
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  return `${Math.round(bps / 1000)} kbps`;
};
