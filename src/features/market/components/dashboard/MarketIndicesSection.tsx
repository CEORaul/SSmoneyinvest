"use client"

import { BarChart3 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TradingViewMiniChart } from "@/components/tradingview/TradingViewMiniChart"
import { MARKET_INDICES } from "@/features/market/tradingview-symbols"

/// Mercado 2.0's "Índices" — IBOV/IFIX/S&P500/NASDAQ/DOW/DAX/NIKKEI have no
/// Company row in this app (no index-price sync exists anywhere in the
/// codebase), so every card is a live TradingView Mini Chart rather than an
/// app-side query — the only honest way to show real values here.
export function MarketIndicesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" />
          Índices
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MARKET_INDICES.map((index) => (
            <div key={index.ticker} className="rounded-lg border border-border p-2">
              <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">{index.label}</p>
              <TradingViewMiniChart ticker={index.ticker} tradingViewSymbol={index.tradingViewSymbol} height={140} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
