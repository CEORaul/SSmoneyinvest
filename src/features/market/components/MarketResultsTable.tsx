"use client"

import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PriceChangeTag } from "@/components/shared/PriceChangeTag"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { translateSector } from "@/features/company/sector-labels"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import { QuickActionsMenu } from "@/features/market/components/QuickActionsMenu"
import type { MarketAssetRow } from "@/features/market/discovery-types"
import { formatCompactNumber, formatCurrencyCents, formatCurrencyCentsCompact, formatPercent } from "@/utils/format"

interface MarketResultsTableProps {
  rows: MarketAssetRow[]
}

function formatRatio(value: number | null): string {
  return value == null ? "—" : value.toFixed(2).replace(".", ",")
}

export function MarketResultsTable({ rows }: MarketResultsTableProps) {
  const router = useRouter()

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ativo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead className="text-right">Variação</TableHead>
            <TableHead className="text-right">Dividend Yield</TableHead>
            <TableHead className="text-right">P/L</TableHead>
            <TableHead className="text-right">P/VP</TableHead>
            <TableHead className="text-right">ROE</TableHead>
            <TableHead className="text-right">Market Cap</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead className="text-right">Volume</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((asset) => (
            <TableRow
              key={asset.id}
              className="cursor-pointer"
              onClick={() => router.push(`/empresa/${asset.ticker}`)}
            >
              <TableCell className="p-0">
                <div className="flex items-center gap-3 px-4 py-3">
                  <TickerBadge ticker={asset.ticker} logoUrl={asset.logoUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{asset.ticker}</p>
                    <p className="truncate text-xs text-muted-foreground">{asset.name}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{getAssetCategoryMeta(asset.assetClass).label}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrencyCents(asset.priceCents)}</TableCell>
              <TableCell className="text-right">
                <PriceChangeTag changePct={asset.priceChangePct} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {asset.dividendYieldPct != null && asset.dividendYieldPct > 0
                  ? formatPercent(asset.dividendYieldPct)
                  : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatRatio(asset.priceToEarnings)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatRatio(asset.priceToBook)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {asset.roe != null ? formatPercent(asset.roe) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {asset.marketCapCents != null ? formatCurrencyCentsCompact(asset.marketCapCents) : "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {asset.sector ? translateSector(asset.sector) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {asset.volume != null ? formatCompactNumber(asset.volume) : "—"}
              </TableCell>
              <TableCell>
                <QuickActionsMenu asset={asset} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
