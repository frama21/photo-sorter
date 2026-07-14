import type { ReactNode } from "react"
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemMedia, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"

import type { PhotoFile } from "@/types"
import { formatFileSize, formatDate, formatDuration, formatBitrate, formatTimestamp } from "@/services/exifService"

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

// A single icon + label + value row. min-w-0 + break-words keep long values
// (camera names, codecs) from overflowing in narrow layouts.
const InfoItem = ({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) => (
  <Item className="px-2 py-1.5">
    <ItemMedia variant="icon">{icon}</ItemMedia>
    <ItemContent className="min-w-0">
      <ItemTitle>{label}</ItemTitle>
      <ItemDescription className="break-words">{value}</ItemDescription>
    </ItemContent>
  </Item>
)

const MetadataPanel = ({ photo }: MetadataPanelProps) => {
  if (!photo) {
    return (
      <Card size="sm" className="w-full">
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-4">Pilih foto untuk melihat metadata</p>
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

  const settingsFields = isVideo
    ? [
        { label: "Durasi", icon: <Gauge className={iconCls} />, value: formatDuration(metadata.duration) },
        { label: "FPS", icon: <Clock className={iconCls} />, value: metadata.fps || "-" },
        { label: "Codec Video", icon: <Video className={iconCls} />, value: metadata.videoCodec || "-" },
        { label: "Codec Audio", icon: <AudioLines className={iconCls} />, value: metadata.audioCodec || "-" }
      ]
    : [
        { label: "ISO", icon: <Gauge className={iconCls} />, value: metadata.iso || "-" },
        { label: "Shutter", icon: <Clock className={iconCls} />, value: metadata.shutterSpeed || "-" },
        { label: "Aperture", icon: <Aperture className={iconCls} />, value: metadata.aperture || "-" },
        { label: "Focal Length", icon: <Ruler className={iconCls} />, value: metadata.focalLength || "-" }
      ]

  const fileFields = [
    { label: "Tanggal", icon: <Calendar className={iconCls} />, value: dateLabel },
    { label: "Ukuran", icon: <HardDrive className={iconCls} />, value: formatFileSize(metadata.fileSize) },
    {
      label: "Dimensi",
      icon: <Maximize className={iconCls} />,
      value: metadata.dimensions.width === 0 ? "-" : `${metadata.dimensions.width} × ${metadata.dimensions.height}`
    },
    {
      label: "Megapixel",
      icon: <Camera className={iconCls} />,
      value: metadata.megapixels === 0 ? "-" : `${metadata.megapixels} MP`
    },
    ...(isVideo
      ? [{ label: "Bitrate", icon: <Gauge className={iconCls} />, value: formatBitrate(metadata.bitrate) }]
      : [])
  ]

  const detailFields = [...settingsFields, ...fileFields]

  return (
    <Card size="sm" className="w-full">
      <CardHeader>
        <CardTitle className="flex flex-row gap-3 items-center">
          {isVideo ? (
            <Video className="w-6 h-6 text-primary shrink-0" />
          ) : (
            <Image className="w-6 h-6 text-primary shrink-0" />
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-lg md:text-xl font-bold leading-tight">
              {isVideo ? "Informasi Video" : "Informasi Foto"}
            </span>
            <span className="text-xs text-muted-foreground truncate">{photo.name}</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Camera + lens: full width since values can be long */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-2 gap-y-0.5">
          <InfoItem
            icon={<Camera className={iconCls} />}
            label="Kamera"
            value={formatCamera(metadata.cameraMake, metadata.cameraModel)}
          />
          {!isVideo && (
            <InfoItem icon={<Aperture className={iconCls} />} label="Lensa" value={metadata.lens || "-"} />
          )}
        </div>

        <Separator className="my-3" />

        {/* Details: fluid grid that fits as many ~140px columns as the panel allows */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-2 gap-y-0.5">
          {detailFields.map(field => (
            <InfoItem key={field.label} icon={field.icon} label={field.label} value={field.value} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default MetadataPanel
