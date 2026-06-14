import { Check, X, Scissors, Copy, Logs } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemMedia,
  ItemGroup,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";

import type { SortOperation } from "@/types";

interface OperationLogProps {
  operations: SortOperation[];
}

const OperationLog = ({ operations }: OperationLogProps) => {
  if (operations.length === 0) return null;

  const recentOps = operations.slice(-3).reverse();

  return (
    <Card size="sm" className="w-full">
      <CardHeader>
        <CardTitle className="flex flex-row items-center gap-3">
          <Logs className="w-6 h-6" />
          <span className="text-xl font-bold"> Log Operasi Terakhir</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center pt-3 pb-5">
          <ItemGroup className="gap-5">
            {recentOps.map((op) => (
              <Item
                key={op.timestamp}
                variant="outline"
                role="listitem"
                className={`flex items-center ${
                  op.success
                    ? "bg-green-500/10 border border-green-700"
                    : "bg-red-500/10 border border-red-700"
                }`}
              >
                <ItemMedia>
                  {op.success ? (
                    <Check className="text-green-500 size-10" />
                  ) : (
                    <X className="text-red-500 size-10" />
                  )}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="line-clamp-1">
                    {op.photoName}
                  </ItemTitle>
                  <ItemDescription>
                    <div className="flex items-center gap-1">
                      {op.mode === "cut" ? (
                        <Scissors className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span className="line-clamp-1">
                        {op.success
                          ? `${op.mode === "cut" ? "Cut" : "Copy"} → ${op.folderName}`
                          : op.error || "Gagal"}
                      </span>
                    </div>
                  </ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </div>
      </CardContent>
    </Card>
  );
};

export default OperationLog;
