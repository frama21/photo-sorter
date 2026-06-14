import { ChartColumnDecreasing } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";

interface StatsProps {
  totalPhotos: number;
  sortedCount: number;
  stats: {
    success: number;
    failed: number;
    total: number;
  };
}

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
          <Item>
            <ItemContent>
              <ItemTitle>Total Foto</ItemTitle>
            </ItemContent>
            <ItemActions>
              <ItemDescription>{totalPhotos}</ItemDescription>
            </ItemActions>
          </Item>
          <Item>
            <ItemContent>
              <ItemTitle>Sudah Disortir</ItemTitle>
            </ItemContent>
            <ItemActions>
              <ItemDescription>{sortedCount}</ItemDescription>
            </ItemActions>
          </Item>
          <Item>
            <ItemContent>
              <ItemTitle>Belum Disortir</ItemTitle>
            </ItemContent>
            <ItemActions>
              <ItemDescription>{totalPhotos - sortedCount}</ItemDescription>
            </ItemActions>
          </Item>
        </div>
        <Separator />
        <div className="flex flex-col items-center">
          <Item>
            <ItemContent>
              <ItemTitle>Operasi Sukses</ItemTitle>
            </ItemContent>
            <ItemActions>
              <ItemDescription>{stats.success}</ItemDescription>
            </ItemActions>
          </Item>
          {stats.failed > 0 && (
            <Item>
              <ItemContent>
                <ItemTitle>Operasi Gagal</ItemTitle>
              </ItemContent>
              <ItemActions>
                <ItemDescription>{stats.failed}</ItemDescription>
              </ItemActions>
            </Item>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Stats;
