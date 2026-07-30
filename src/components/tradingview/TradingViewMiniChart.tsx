"use client"

import type { ReactNode } from "react"

import { TradingViewFallback } from "@/lib/tradingview/fallback"
import { useChartTheme } from "@/lib/tradingview/theme"
import { TradingViewService } from "@/lib/tradingview/service"
import { buildChartRenderConfig } from "@/lib/tradingview/utils"

interface TradingViewMiniChartProps {
  ticker: string
  /// e.g. <Sparkline .../> from src/features/portfolio/components/ — the
  /// compact per-row chart this would eventually replace.
  fallback?: ReactNode
  className?: string
  height?: number | string
}

/// A compact, single-symbol sparkline-style chart — the future TradingView
/// replacement for a row-level chart (e.g. the Sparkline used in
/// /carteira's position table). Same isAvailable()-gated fallback shape as
/// TradingViewChart, just a smaller default height suited to inline use.
export function TradingViewMiniChart({ ticker, fallback, className, height = 60 }: TradingViewMiniChartProps) {
  const theme = useChartTheme()
  const config = buildChartRenderConfig({ kind: "MINI_CHART", theme, symbol: { ticker }, height })

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
