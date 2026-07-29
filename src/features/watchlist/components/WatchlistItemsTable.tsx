"use client"

import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PriceChangeTag } from "@/components/shared/PriceChangeTag"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { translateSector } from "@/features/company/sector-labels"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import { WatchlistQuickActions } from "@/features/watchlist/components/WatchlistQuickActions"
import type { WatchlistItemRow } from "@/features/watchlist/types"
import { formatCompactNumber, formatCurrencyCents, formatCurrencyCentsCompact, formatPercent } from "@/utils/format"

interface WatchlistItemsTableProps {
  items: WatchlistItemRow[]
  selectedIds: Set<string>
  onToggleSelect: (companyId: string) => void
  onRemoved: (itemId: string) => void
}

function formatChange(pct: number | null) {
  return pct == null ? <span className="text-muted-foreground">—</span> : <PriceChangeTag changePct={pct} />
}

function formatRange(lowCents: number | null, highCents: number | null): string {
  if (lowCents == null && highCents == null) return "—"
  const low = lowCents != null ? formatCurrencyCents(lowCents) : "—"
  const high = highCents != null ? formatCurrencyCents(highCents) : "—"
  return `${low} – ${high}`
}

/// Desktop view — every field the spec's "Card dos Ativos" asks for, laid
/// out as table columns instead of a card since a table reads better once
/// there are more than a handful of assets. Mirrors MarketResultsTable's
/// exact conventions (row click navigates, action cells stop propagation).
export function WatchlistItemsTable({ items, selectedIds, onToggleSelect, onRemoved }: WatchlistItemsTableProps) {
  const router = useRouter()

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Ativo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead className="text-right">Dia</TableHead>
            <TableHead className="text-right">Semana</TableHead>
            <TableHead className="text-right">Mês</TableHead>
            <TableHead className="text-right">Faixa 52 sem.</TableHead>
            <TableHead className="text-right">Volume</TableHead>
            <TableHead className="text-right">Market Cap</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead className="text-right">DY</TableHead>
            <TableHead className="text-right">Alertas</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/empresa/${item.ticker}`)}>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(item.companyId)}
                  onCheckedChange={() => onToggleSelect(item.companyId)}
                  aria-label={`Selecionar ${item.ticker} para comparar`}
                />
              </TableCell>
              <TableCell className="p-0">
                <div className="flex items-center gap-3 px-4 py-3">
                  <TickerBadge ticker={item.ticker} logoUrl={item.logoUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.ticker}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.name}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{getAssetCategoryMeta(item.assetClass).label}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrencyCents(item.priceCents)}</TableCell>
              <TableCell className="text-right">{formatChange(item.dailyChangePct)}</TableCell>
              <TableCell className="text-right">{formatChange(item.weeklyChangePct)}</TableCell>
              <TableCell className="text-right">{formatChange(item.monthlyChangePct)}</TableCell>
              <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                {formatRange(item.fiftyTwoWeekLowCents, item.fiftyTwoWeekHighCents)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.volume != null ? formatCompactNumber(item.volume) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.marketCapCents != null ? formatCurrencyCentsCompact(item.marketCapCents) : "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {item.sector ? translateSector(item.sector) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.dividendYieldPct > 0 ? formatPercent(item.dividendYieldPct) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.alertsCount}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <WatchlistQuickActions item={item} onRemoved={onRemoved} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
