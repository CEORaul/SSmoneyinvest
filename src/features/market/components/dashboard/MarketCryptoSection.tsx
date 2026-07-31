"use client"

import { Bitcoin } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TradingViewMiniChart } from "@/components/tradingview/TradingViewMiniChart"
import { MARKET_CRYPTO } from "@/features/market/tradingview-symbols"

/// Mercado 2.0's "Criptomoedas" — same reasoning as MarketIndicesSection:
/// AssetClass.CRYPTO.hasMarketData is false (see asset-category.ts), so
/// there's no real price data for BTC/ETH/SOL/etc. in this app's own DB.
/// Every card is a live TradingView Mini Chart, never a fabricated number.
export function MarketCryptoSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bitcoin className="size-4 text-primary" />
          Criptomoedas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MARKET_CRYPTO.map((crypto) => (
            <div key={crypto.ticker} className="rounded-lg border border-border p-2">
              <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">{crypto.label}</p>
              <TradingViewMiniChart ticker={crypto.ticker} tradingViewSymbol={crypto.tradingViewSymbol} height={140} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
