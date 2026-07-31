"use client"

import { Globe2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TradingViewMarketOverview } from "@/components/tradingview/TradingViewMarketOverview"
import { MARKET_OVERVIEW_TABS } from "@/features/market/tradingview-symbols"

/// Mercado 2.0's "Visão Geral" — the official Market Overview widget's own
/// internal tab switcher covers Brasil/Estados Unidos/Europa/Cripto/Forex,
/// so this wrapper only supplies the Card chrome and the symbol list.
export function MarketOverviewSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe2 className="size-4 text-primary" />
          Visão Geral do Mercado
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TradingViewMarketOverview tabs={MARKET_OVERVIEW_TABS} height={420} />
      </CardContent>
    </Card>
  )
}
