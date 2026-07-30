"use client"

import type { ReactNode } from "react"

import { TradingViewFallback } from "@/lib/tradingview/fallback"
import { useChartTheme } from "@/lib/tradingview/theme"
import { TradingViewService } from "@/lib/tradingview/service"
import { buildChartRenderConfig } from "@/lib/tradingview/utils"

interface TradingViewTickerTapeProps {
  tickers?: string[]
  fallback?: ReactNode
  className?: string
}

/// A horizontal scrolling strip of quotes — no direct existing SSmoney
/// equivalent, so this renders "Coming Soon" unless a caller passes
/// `fallback`. A thin strip, hence the much smaller default height than
/// every other TradingView* component.
export function TradingViewTickerTape({ tickers = [], fallback, className }: TradingViewTickerTapeProps) {
  const theme = useChartTheme()
  const config = buildChartRenderConfig({
    kind: "TICKER_TAPE",
    theme,
    symbols: tickers.map((ticker) => ({ ticker })),
    height: 46,
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
