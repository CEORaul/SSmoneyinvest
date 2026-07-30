"use client"

import type { ReactNode } from "react"

import { TradingViewFallback } from "@/lib/tradingview/fallback"
import { useChartTheme } from "@/lib/tradingview/theme"
import { TradingViewService } from "@/lib/tradingview/service"
import { buildChartRenderConfig } from "@/lib/tradingview/utils"

interface TradingViewHeatmapProps {
  tickers?: string[]
  fallback?: ReactNode
  className?: string
  height?: number | string
}

/// A sector/market heatmap — no direct existing SSmoney equivalent today,
/// so this renders "Coming Soon" unless a caller explicitly passes
/// `fallback`. Multi-symbol, same shape as TradingViewMarketOverview.
export function TradingViewHeatmap({ tickers = [], fallback, className, height = 400 }: TradingViewHeatmapProps) {
  const theme = useChartTheme()
  const config = buildChartRenderConfig({
    kind: "HEATMAP",
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
