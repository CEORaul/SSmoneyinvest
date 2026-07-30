"use client"

import type { ReactNode } from "react"

import { TradingViewFallback } from "@/lib/tradingview/fallback"
import { useChartTheme } from "@/lib/tradingview/theme"
import { TradingViewService } from "@/lib/tradingview/service"
import { buildChartRenderConfig } from "@/lib/tradingview/utils"

interface TradingViewMarketOverviewProps {
  tickers?: string[]
  /// e.g. /mercado's existing movers table — shown while no provider
  /// exists.
  fallback?: ReactNode
  className?: string
  height?: number | string
}

/// A multi-symbol market snapshot (altas/baixas/setores) — the future
/// TradingView replacement for part of /mercado's own tables. Multi-symbol,
/// so it builds `symbols` rather than a single `symbol` (see
/// ChartRenderConfig's doc in types.ts).
export function TradingViewMarketOverview({ tickers = [], fallback, className, height = 400 }: TradingViewMarketOverviewProps) {
  const theme = useChartTheme()
  const config = buildChartRenderConfig({
    kind: "MARKET_OVERVIEW",
    theme,
    symbols: tickers.map((ticker) => ({ ticker })),
    height,
  })

  if (TradingViewService.isAvailable()) {
    void config
    return null
  }

  return (
    <TradingViewFallback height={config.size.height} className={className}>
      {fallback}
    </TradingViewFallback>
  )
}
