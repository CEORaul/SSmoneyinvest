"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { LiveChangeTag } from "@/components/shared/live-market/LiveChangeTag"
import { LiveMarketCapText } from "@/components/shared/live-market/LiveMarketCapText"
import { LivePriceText } from "@/components/shared/live-market/LivePriceText"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { translateSector } from "@/features/company/sector-labels"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import { QuickActionsMenu } from "@/features/market/components/QuickActionsMenu"
import type { MarketAssetRow } from "@/features/market/discovery-types"
import { formatPercent } from "@/utils/format"

interface MarketResultsCardsProps {
  rows: MarketAssetRow[]
}

export function MarketResultsCards({ rows }: MarketResultsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((asset) => (
        <Link
          key={asset.id}
          href={`/empresa/${asset.ticker}`}
          className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <TickerBadge ticker={asset.ticker} logoUrl={asset.logoUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{asset.ticker}</p>
                <p className="truncate text-xs text-muted-foreground">{asset.name}</p>
              </div>
            </div>
            <QuickActionsMenu asset={asset} />
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="outline">{getAssetCategoryMeta(asset.assetClass).label}</Badge>
            {asset.sector && <span className="text-xs text-muted-foreground">{translateSector(asset.sector)}</span>}
          </div>

          <div className="flex items-end justify-between">
            <div>
              <LivePriceText id={asset.id} priceCents={asset.priceCents} className="text-lg font-semibold tabular-nums" />
              <LiveChangeTag id={asset.id} priceCents={asset.priceCents} priceChangePct={asset.priceChangePct} />
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {asset.dividendYieldPct != null && asset.dividendYieldPct > 0 && (
                <p>DY {formatPercent(asset.dividendYieldPct)}</p>
              )}
              {asset.priceToEarnings != null && <p>P/L {asset.priceToEarnings.toFixed(2).replace(".", ",")}</p>}
              <LiveMarketCapText id={asset.id} priceCents={asset.priceCents} marketCapCents={asset.marketCapCents} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
