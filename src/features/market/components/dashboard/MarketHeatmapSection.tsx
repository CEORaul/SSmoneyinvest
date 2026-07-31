"use client"

import { Flame } from "lucide-react"
import { useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TradingViewHeatmap } from "@/components/tradingview/TradingViewHeatmap"
import { HEATMAP_DATA_SOURCES } from "@/features/market/tradingview-symbols"

type HeatmapCategory = keyof typeof HEATMAP_DATA_SOURCES

const CATEGORY_LABELS: Record<HeatmapCategory, string> = {
  ACOES: "Ações",
  FIIS: "FIIs",
  ETFS: "ETFs",
  CRIPTO: "Cripto",
}

/// Mercado 2.0's "Mapa de Calor" — color proportional to variação, block
/// size proportional to Market Cap, both native to the official heatmap
/// widgets. Category switching is this component's own job — CRIPTO mounts
/// TradingView's dedicated Crypto Coins Heatmap widget (see
/// HEATMAP_DATA_SOURCES' own doc comment for why that's a different widget
/// kind, not just a different dataSource); Ações/FIIs/ETFs show an honest
/// "em breve" state instead of a guessed Stock Heatmap dataSource that
/// might silently render the wrong market. Clicking a tile inside either
/// widget is controlled by TradingView's own sealed iframe and does not
/// navigate to this app's /empresa/[ticker] — a known limitation of the
/// free widgets, not something this component can work around.
export function MarketHeatmapSection() {
  const [category, setCategory] = useState<HeatmapCategory>("CRIPTO")
  const config = HEATMAP_DATA_SOURCES[category]

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Flame className="size-4 text-primary" />
          Mapa de Calor
        </CardTitle>
        <Tabs value={category} onValueChange={(value) => setCategory(value as HeatmapCategory)}>
          <TabsList>
            {(Object.keys(CATEGORY_LABELS) as HeatmapCategory[]).map((key) => (
              <TabsTrigger key={key} value={key}>
                {CATEGORY_LABELS[key]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {config ? (
          <TradingViewHeatmap dataSource={config.dataSource} kind={config.kind} height={420} />
        ) : (
          <div className="flex h-[420px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center">
            <p className="text-sm font-medium">Mapa de calor de {CATEGORY_LABELS[category]} em breve</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              O widget gratuito da TradingView ainda não tem um universo específico de {CATEGORY_LABELS[category]}{" "}
              brasileiros validado — use a aba Cripto ou a busca do Mercado para esses ativos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
