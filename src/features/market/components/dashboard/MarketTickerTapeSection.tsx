"use client"

import { TradingViewTickerTape } from "@/components/tradingview/TradingViewTickerTape"
import { TICKER_TAPE_SYMBOLS } from "@/features/market/tradingview-symbols"

/// Mercado 2.0's top-of-page strip — IBOV/IFIX/blue chips/BTC/ETH/Dólar,
/// horizontal scroll built into the official widget itself. Always visible
/// above the fold, so it's the one TradingView section NOT behind
/// next/dynamic — the underlying script still only loads once this
/// component's own IntersectionObserver confirms visibility (see
/// TradingViewTickerTape/useIsVisibleOnce), same as every other widget.
export function MarketTickerTapeSection() {
  return (
    <div className="w-full overflow-hidden border-y border-border bg-card/60">
      <TradingViewTickerTape symbols={TICKER_TAPE_SYMBOLS} />
    </div>
  )
}
