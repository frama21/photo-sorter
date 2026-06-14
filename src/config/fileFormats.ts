export interface FileFormatConfig {
  extensions: string[];
  mimeTypes?: string[];
  label: string;
  category: "standard" | "raw" | "vector" | "video" | "other";
  previewable: boolean;
}

export const PHOTO_FORMATS: Record<string, FileFormatConfig> = {
  // non raw format
  jpeg: {
    extensions: [".jpg", ".jpeg", ".jpe"],
    mimeTypes: ["image/jpeg"],
    label: "JPEG",
    category: "standard",
    previewable: true,
  },
  png: {
    extensions: [".png"],
    mimeTypes: ["image/png"],
    label: "PNG",
    category: "standard",
    previewable: true,
  },
  gif: {
    extensions: [".gif"],
    mimeTypes: ["image/gif"],
    label: "GIF",
    category: "standard",
    previewable: true,
  },
  webp: {
    extensions: [".webp"],
    mimeTypes: ["image/webp"],
    label: "WebP",
    category: "standard",
    previewable: true,
  },
  avif: {
    extensions: [".avif"],
    mimeTypes: ["image/avif"],
    label: "AVIF",
    category: "standard",
    previewable: true,
  },
  bmp: {
    extensions: [".bmp", ".dib"],
    mimeTypes: ["image/bmp"],
    label: "BMP",
    category: "standard",
    previewable: true,
  },
  tiff: {
    extensions: [".tiff", ".tif"],
    mimeTypes: ["image/tiff"],
    label: "TIFF",
    category: "standard",
    previewable: true,
  },

  // RAW Format
  canonRaw: {
    extensions: [".cr2", ".cr3", ".crw"],
    label: "Canon RAW",
    category: "raw",
    previewable: false,
  },
  nikonRaw: {
    extensions: [".nef", ".nrw"],
    label: "Nikon RAW",
    category: "raw",
    previewable: false,
  },
  sonyRaw: {
    extensions: [".arw", ".srf", ".sr2"],
    label: "Sony RAW",
    category: "raw",
    previewable: false,
  },
  fujiRaw: {
    extensions: [".raf"],
    label: "Fuji RAW",
    category: "raw",
    previewable: false,
  },
  panasonicRaw: {
    extensions: [".rw2", ".raw"],
    label: "Panasonic RAW",
    category: "raw",
    previewable: false,
  },
  olympusRaw: {
    extensions: [".orf"],
    label: "Olympus RAW",
    category: "raw",
    previewable: false,
  },
  pentaxRaw: {
    extensions: [".pef", ".ptx"],
    label: "Pentax RAW",
    category: "raw",
    previewable: false,
  },
  leicaRaw: {
    extensions: [".dng", ".rwl"],
    label: "Leica/DNG RAW",
    category: "raw",
    previewable: false,
  },
  hasselbladRaw: {
    extensions: [".3fr"],
    label: "Hasselblad RAW",
    category: "raw",
    previewable: false,
  },
  sigmaRaw: {
    extensions: [".x3f"],
    label: "Sigma RAW",
    category: "raw",
    previewable: false,
  },

  // file asset image
  svg: {
    extensions: [".svg"],
    mimeTypes: ["image/svg+xml"],
    label: "SVG",
    category: "vector",
    previewable: true,
  },
  ico: {
    extensions: [".ico"],
    mimeTypes: ["image/x-icon"],
    label: "ICO",
    category: "other",
    previewable: true,
  },
  heic: {
    // Chrome/Edge/Firefox cannot decode HEIC/HEIF in an <img>, so mark it
    // non-previewable instead of rendering a permanently broken image.
    extensions: [".heic", ".heif"],
    mimeTypes: ["image/heic"],
    label: "HEIC/HEIF",
    category: "other",
    previewable: false,
  },

  // video assets
  mp4: {
    extensions: [".mp4", ".m4v"],
    mimeTypes: ["video/mp4", "video/x-m4v"],
    label: "MP4",
    category: "video",
    previewable: true,
  },
  webm: {
    extensions: [".webm"],
    mimeTypes: ["video/webm"],
    label: "WebM",
    category: "video",
    previewable: true,
  },
  ogg: {
    extensions: [".ogv"],
    mimeTypes: ["video/ogg"],
    label: "Ogg Video",
    category: "video",
    previewable: true,
  },
  mov: {
    extensions: [".mov", ".qt"],
    mimeTypes: ["video/quicktime"],
    label: "QuickTime",
    category: "video",
    previewable: true,
  },
  avi: {
    extensions: [".avi"],
    mimeTypes: ["video/x-msvideo"],
    label: "AVI",
    category: "video",
    previewable: true,
  },
  wmv: {
    extensions: [".wmv"],
    mimeTypes: ["video/x-ms-wmv"],
    label: "WMV",
    category: "video",
    previewable: true,
  },
  mkv: {
    extensions: [".mkv"],
    mimeTypes: ["video/x-matroska"],
    label: "Matroska",
    category: "video",
    previewable: true,
  },
  flv: {
    extensions: [".flv"],
    mimeTypes: ["video/x-flv"],
    label: "Flash Video",
    category: "video",
    previewable: true,
  },
  mpeg: {
    extensions: [".mpeg", ".mpg", ".mpe"],
    mimeTypes: ["video/mpeg"],
    label: "MPEG",
    category: "video",
    previewable: true,
  },
  ts: {
    extensions: [".ts"],
    mimeTypes: ["video/mp2t"],
    label: "MPEG Transport Stream",
    category: "video",
    previewable: true,
  },
  "3gp": {
    extensions: [".3gp", ".3g2"],
    mimeTypes: ["video/3gpp", "video/3gpp2"],
    label: "3GP",
    category: "video",
    previewable: true,
  },
};

export const ALL_EXTENSIONS: string[] = Object.values(PHOTO_FORMATS).flatMap(
  (f) => f.extensions,
);
export const PREVIEWABLE_EXTENSIONS: string[] = Object.values(PHOTO_FORMATS)
  .filter((f) => f.previewable)
  .flatMap((f) => f.extensions);

export const EXTENSION_TO_FORMAT: Record<string, FileFormatConfig> = {};
for (const format of Object.values(PHOTO_FORMATS)) {
  for (const ext of format.extensions) {
    EXTENSION_TO_FORMAT[ext.toLowerCase()] = format;
  }
}

export const isSupportedImage = (filename: string): boolean => {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return ALL_EXTENSIONS.includes(ext);
};

export const isPreviewable = (filename: string): boolean => {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return PREVIEWABLE_EXTENSIONS.includes(ext);
};

export const getFileFormatInfo = (
  filename: string,
): FileFormatConfig | null => {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return EXTENSION_TO_FORMAT[ext] ?? null;
};
