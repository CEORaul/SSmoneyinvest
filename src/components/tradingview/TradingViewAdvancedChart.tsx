"use client"

import type { ReactNode } from "react"

import { TradingViewFallback } from "@/lib/tradingview/fallback"
import { useChartTheme } from "@/lib/tradingview/theme"
import { TradingViewService } from "@/lib/tradingview/service"
import { buildChartRenderConfig } from "@/lib/tradingview/utils"
import type { ChartInterval } from "@/lib/tradingview/types"

interface TradingViewAdvancedChartProps {
  ticker: string
  interval?: ChartInterval
  /// e.g. the full <FinancialChart .../> from
  /// src/features/company/components/ — /empresa/[ticker]'s main chart.
  fallback?: ReactNode
  className?: string
  height?: number | string
}

/// The full-featured, indicator-capable chart — the future TradingView
/// Charting Library replacement for /empresa/[ticker]'s main
/// FinancialChart. Same isAvailable()-gated fallback shape as
/// TradingViewChart; the only real difference today is the larger default
/// height a full chart page section expects.
export function TradingViewAdvancedChart({ ticker, interval, fallback, className, height = 500 }: TradingViewAdvancedChartProps) {
  const theme = useChartTheme()
  const config = buildChartRenderConfig({ kind: "ADVANCED_CHART", theme, symbol: { ticker }, height })
  const configWithInterval = { ...config, interval }

  if (TradingViewService.isAvailable()) {
    void configWithInterval
    return null
  }

  return (
    <TradingViewFallback height={config.size.height} className={className}>
      {fallback}
    </TradingViewFallback>
  )
}
