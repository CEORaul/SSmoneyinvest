"use client"

import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { PriceChangeTag } from "@/components/shared/PriceChangeTag"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { translateSector } from "@/features/company/sector-labels"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import { WatchlistQuickActions } from "@/features/watchlist/components/WatchlistQuickActions"
import type { WatchlistItemRow } from "@/features/watchlist/types"
import { formatCurrencyCents, formatCurrencyCentsCompact, formatPercent } from "@/utils/format"

interface WatchlistItemsCardsProps {
  items: WatchlistItemRow[]
  selectedIds: Set<string>
  onToggleSelect: (companyId: string) => void
  onRemoved: (itemId: string) => void
}

/// Tablet/mobile view — same data as WatchlistItemsTable, reflowed into a
/// card grid instead of a wide table. Same click-to-navigate + stopPropagation
/// convention as MarketResultsCards.
export function WatchlistItemsCards({ items, selectedIds, onToggleSelect, onRemoved }: WatchlistItemsCardsProps) {
  const router = useRouter()

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => router.push(`/empresa/${item.ticker}`)}
          className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(item.companyId)}
                  onCheckedChange={() => onToggleSelect(item.companyId)}
                  aria-label={`Selecionar ${item.ticker} para comparar`}
                />
              </div>
              <TickerBadge ticker={item.ticker} logoUrl={item.logoUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.ticker}</p>
                <p className="truncate text-xs text-muted-foreground">{item.name}</p>
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <WatchlistQuickActions item={item} onRemoved={onRemoved} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="outline">{getAssetCategoryMeta(item.assetClass).label}</Badge>
            {item.sector && <span className="text-xs text-muted-foreground">{translateSector(item.sector)}</span>}
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-lg font-semibold tabular-nums">{formatCurrencyCents(item.priceCents)}</p>
              <PriceChangeTag changePct={item.dailyChangePct} />
            </div>
            <div className="space-y-0.5 text-right text-xs text-muted-foreground">
              {item.weeklyChangePct != null && <p>Semana: {formatPercent(item.weeklyChangePct)}</p>}
              {item.monthlyChangePct != null && <p>Mês: {formatPercent(item.monthlyChangePct)}</p>}
              {item.dividendYieldPct > 0 && <p>DY {formatPercent(item.dividendYieldPct)}</p>}
              {item.marketCapCents != null && <p>{formatCurrencyCentsCompact(item.marketCapCents)}</p>}
            </div>
          </div>

          {item.alertsCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {item.alertsCount} alerta{item.alertsCount > 1 ? "s" : ""} criado{item.alertsCount > 1 ? "s" : ""}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
