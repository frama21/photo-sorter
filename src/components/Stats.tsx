import type { ReactNode } from "react"
import { ChartColumnDecreasing } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item"

interface StatsProps {
  totalPhotos: number
  sortedCount: number
  stats: {
    success: number
    failed: number
    total: number
  }
}

/** A single label → value statistic row. */
const StatRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <Item>
    <ItemContent>
      <ItemTitle>{label}</ItemTitle>
    </ItemContent>
    <ItemActions>
      <ItemDescription>{value}</ItemDescription>
    </ItemActions>
  </Item>
)

const Stats = ({ totalPhotos, sortedCount, stats }: StatsProps) => {
  return (
    <Card size="sm" className="w-full">
      <CardHeader>
        <CardTitle className="flex flex-row items-center gap-3">
          <ChartColumnDecreasing className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold"> Statistik</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <StatRow label="Total Foto" value={totalPhotos} />
          <StatRow label="Sudah Disortir" value={sortedCount} />
          <StatRow label="Belum Disortir" value={totalPhotos - sortedCount} />
        </div>
        <Separator />
        <div className="flex flex-col items-center">
          <StatRow label="Operasi Sukses" value={stats.success} />
          {stats.failed > 0 && <StatRow label="Operasi Gagal" value={stats.failed} />}
        </div>
      </CardContent>
    </Card>
  )
}

export default Stats
