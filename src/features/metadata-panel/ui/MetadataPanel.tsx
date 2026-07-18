import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import {
  Camera,
  Aperture,
  Clock,
  Gauge,
  Ruler,
  Calendar,
  HardDrive,
  Maximize,
  Image,
  AudioLines,
  Video
} from "lucide-react"

import { Card, CardContent } from "@/shared/ui/card"
import PanelHeader from "@/shared/ui/PanelHeader"
import i18n from "@/shared/i18n"

import type { PhotoFile } from "@/shared/types"
import { cn } from "@/shared/lib/utils"
import {
  formatFileSize,
  formatDate,
  formatDuration,
  formatBitrate,
  formatTimestamp
} from "@/shared/services/exifService"

interface MetadataPanelProps {
  photo: PhotoFile | null
}

// Combine make + model without the common "NIKON CORPORATION NIKON D750" repeat.
const formatCamera = (make?: string, model?: string): string => {
  const mk = make?.trim()
  const md = model?.trim()
  if (mk && md) {
    const firstWord = mk.split(/\s+/)[0].toLowerCase()
    if (md.toLowerCase().startsWith(firstWord)) return md
    return `${mk} ${md}`
  }
  return mk || md || "-"
}

/**
 * One metadata cell: label + icon on top, value below in mono. `wide` spans the
 * full row for long values (camera / lens). `pending` shows a shimmer bar
 * instead of the value while an async pass (e.g. RAW dimensions) is resolving.
 */
const StatTile = ({
  icon,
  label,
  value,
  wide = false,
  pending = false
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  wide?: boolean
  pending?: boolean
}) => (
  <div
    className={cn(
      "rounded-xl border border-border/60 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/60 hover:border-border",
      wide && "col-span-2"
    )}
  >
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className="text-primary/80 [&>svg]:size-3.5">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
    {pending ? (
      <div className="skeleton mt-1.5 h-4 w-16 rounded" aria-label={i18n.t("info.calculating")} />
    ) : (
      <p
        className="mt-0.5 font-mono text-sm font-medium tabular-nums break-words leading-snug"
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </p>
    )}
  </div>
)

const MetadataPanel = ({ photo }: MetadataPanelProps) => {
  const { t } = useTranslation()

  if (!photo) {
    return (
      <Card size="sm" className="w-full">
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-4">{t("info.selectPrompt")}</p>
        </CardContent>
      </Card>
    )
  }

  const { metadata } = photo
  const isVideo = metadata.isVideo

  // Capture date when available, otherwise the file's modified date.
  const captureDate = formatDate(metadata.dateTaken)
  const dateLabel = captureDate !== "-" ? captureDate : formatTimestamp(photo.file?.lastModified)

  const iconCls = "w-3 h-3"

  // RAW dimensions are resolved by a deferred libraw-free pass; until then a RAW
  // photo reports 0, which we render as a shimmer rather than a bare "-".
  const isRaw = photo.format.category === "raw"
  const dimsPending = isRaw && metadata.dimensions.width === 0

  const settingsFields = isVideo
    ? [
        {
          label: t("info.duration"),
          icon: <Gauge className={iconCls} />,
          value: formatDuration(metadata.duration)
        },
        { label: t("info.fps"), icon: <Clock className={iconCls} />, value: metadata.fps || "-" },
        { label: t("info.videoCodec"), icon: <Video className={iconCls} />, value: metadata.videoCodec || "-" },
        {
          label: t("info.audioCodec"),
          icon: <AudioLines className={iconCls} />,
          value: metadata.audioCodec || "-"
        }
      ]
    : [
        { label: t("info.iso"), icon: <Gauge className={iconCls} />, value: metadata.iso || "-" },
        { label: t("info.shutter"), icon: <Clock className={iconCls} />, value: metadata.shutterSpeed || "-" },
        { label: t("info.aperture"), icon: <Aperture className={iconCls} />, value: metadata.aperture || "-" },
        { label: t("info.focalLength"), icon: <Ruler className={iconCls} />, value: metadata.focalLength || "-" }
      ]

  const fileFields = [
    { label: t("info.date"), icon: <Calendar className={iconCls} />, value: dateLabel },
    { label: t("info.size"), icon: <HardDrive className={iconCls} />, value: formatFileSize(metadata.fileSize) },
    {
      label: t("info.dimensions"),
      icon: <Maximize className={iconCls} />,
      pending: dimsPending,
      value: metadata.dimensions.width === 0 ? "-" : `${metadata.dimensions.width} × ${metadata.dimensions.height}`
    },
    {
      label: t("info.megapixel"),
      icon: <Camera className={iconCls} />,
      pending: dimsPending,
      value: metadata.megapixels === 0 ? "-" : `${metadata.megapixels} MP`
    },
    ...(isVideo
      ? [{ label: t("info.bitrate"), icon: <Gauge className={iconCls} />, value: formatBitrate(metadata.bitrate) }]
      : [])
  ]

  const detailFields = [...settingsFields, ...fileFields]

  return (
    <Card size="sm" className="w-full">
      <PanelHeader
        icon={isVideo ? <Video /> : <Image />}
        title={isVideo ? t("info.titleVideo") : t("info.titlePhoto")}
        subtitle={<span className="font-mono">{photo.name}</span>}
      />

      <CardContent className="space-y-2">
        {/* Camera + lens span the full row since values run long. */}
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            wide
            icon={<Camera className={iconCls} />}
            label={t("info.camera")}
            value={formatCamera(metadata.cameraMake, metadata.cameraModel)}
          />
          {!isVideo && (
            <StatTile
              wide
              icon={<Aperture className={iconCls} />}
              label={t("info.lens")}
              value={metadata.lens || "-"}
            />
          )}
        </div>

        {/* Settings + file stats: even 2-column grid of equal-height tiles. */}
        <div className="grid grid-cols-2 gap-2">
          {detailFields.map(field => (
            <StatTile
              key={field.label}
              icon={field.icon}
              label={field.label}
              value={field.value}
              pending={"pending" in field ? Boolean(field.pending) : false}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default MetadataPanel
