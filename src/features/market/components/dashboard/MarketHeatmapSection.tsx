"use client"

import { Flame } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TradingViewHeatmap } from "@/components/tradingview/TradingViewHeatmap"
import { CRYPTO_HEATMAP_CONFIG } from "@/features/market/tradingview-symbols"

/// Mercado 2.0's "Mapa de Calor" — color proportional to variação, block
/// size proportional to Market Cap, both native to TradingView's Crypto
/// Coins Heatmap widget. Cripto is the ONLY category rendered here: the
/// free Stock Heatmap widget (which would back Ações/FIIs/ETFs) has no
/// confirmed Brazil-only universe, and there is no category switcher UI
/// left to guess one into — see CRYPTO_HEATMAP_CONFIG's own doc comment.
/// Clicking a tile inside the widget is controlled by TradingView's own
/// sealed iframe and does not navigate to this app's /empresa/[ticker] — a
/// known limitation of the free widget, not something this component can
/// work around.
export function MarketHeatmapSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="size-4 text-primary" />
          Mapa de Calor — Cripto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TradingViewHeatmap
          dataSource={CRYPTO_HEATMAP_CONFIG.dataSource}
          kind={CRYPTO_HEATMAP_CONFIG.kind}
          height={420}
        />
      </CardContent>
    </Card>
  )
}
