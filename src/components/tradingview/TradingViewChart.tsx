"use client"

import type { ReactNode } from "react"

import { TradingViewFallback } from "@/lib/tradingview/fallback"
import { useChartTheme } from "@/lib/tradingview/theme"
import { TradingViewService } from "@/lib/tradingview/service"
import { buildChartRenderConfig } from "@/lib/tradingview/utils"

interface TradingViewChartProps {
  ticker: string
  /// The existing SSmoney chart to show while no provider is available —
  /// e.g. <FinancialChart .../> from src/features/company/components/. Not
  /// wired into any page yet (see src/lib/tradingview/integration-map.ts).
  fallback?: ReactNode
  className?: string
  height?: number | string
}

/// A single-symbol chart — the future TradingView replacement for
/// FinancialChart.tsx's role on /empresa. Renders exclusively through
/// TradingViewService (spec's ABSTRAÇÃO section: no page/component ever
/// talks to TradingView directly). Today that service always reports
/// isAvailable() === false, so this always falls back to `fallback` (the
/// caller's existing chart) or, absent one, "Coming Soon".
export function TradingViewChart({ ticker, fallback, className, height }: TradingViewChartProps) {
  const theme = useChartTheme()

  // Built now so the shape is proven end-to-end even though nothing reads
  // it yet — this is exactly what TradingViewService.mount() will receive
  // the day a real provider exists.
  const config = buildChartRenderConfig({ kind: "CHART", theme, symbol: { ticker }, height })

  if (TradingViewService.isAvailable()) {
    // Unreachable today — no registered provider ever reports available.
    // Kept here so the real mount path already has its call site.
    void config
    return null
  }

  return (
    <TradingViewFallback height={config.size.height} className={className}>
      {fallback}
    </TradingViewFallback>
  )
}
