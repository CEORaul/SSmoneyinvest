"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { LiveChangeTag } from "@/components/shared/live-market/LiveChangeTag"
import { LiveMarketCapText } from "@/components/shared/live-market/LiveMarketCapText"
import { LivePriceText } from "@/components/shared/live-market/LivePriceText"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { translateSector } from "@/features/company/sector-labels"
import { IndicatorBadge } from "@/features/company/components/metrics/IndicatorBadge"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import { QuickActionsMenu } from "@/features/market/components/QuickActionsMenu"
import type { MarketAssetRow } from "@/features/market/discovery-types"
import { formatPercent } from "@/utils/format"

/// P/L, P/VP, ROE, PSR, EV/EBITDA, Margem Líquida — every one that's
/// meaningful for this asset's class self-prunes when unavailable (see
/// IndicatorBadge), so a FII/ETF card naturally shows fewer chips than a
/// STOCK card instead of a row of "—". Dividend Yield stays its own bespoke
/// line above (asset.dividendYieldPct, the real trailing-12-month figure —
/// Stock/Fii/Etf.dividendYield itself is never populated by any sync, so
/// the shared "dividendYield" indicator would wrongly show "Indisponível"
/// here even though this card already has the real number).
const CARD_INDICATOR_KEYS = ["priceToEarnings", "priceToBook", "roe", "psr", "evToEbitda", "netMargin"]

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
              <LiveMarketCapText id={asset.id} priceCents={asset.priceCents} marketCapCents={asset.marketCapCents} />
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-t border-border/60 pt-2">
            {CARD_INDICATOR_KEYS.map((key) => (
              <IndicatorBadge key={key} dto={asset} indicatorKey={key} />
            ))}
          </div>
        </Link>
      ))}
    </div>
  )
}
