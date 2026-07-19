"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AnimatedNumber } from "@/components/shared/AnimatedNumber"
import type { PortfolioTotals } from "@/features/portfolio/queries"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatPercent } from "@/utils/format"

interface PortfolioSummaryCardsProps {
  totals: PortfolioTotals
}

export function PortfolioSummaryCards({ totals }: PortfolioSummaryCardsProps) {
  const cards: { label: string; value: number; format: (value: number) => string; tone?: "gain" | "loss" }[] = [
    { label: "Patrimônio", value: totals.currentValueCents, format: formatCurrencyCents },
    {
      label: "Lucro/Prejuízo",
      value: totals.profitCents,
      format: formatCurrencyCents,
      tone: totals.profitCents >= 0 ? "gain" : "loss",
    },
    {
      label: "Dividendos recebidos",
      value: totals.dividendsReceivedCents,
      format: formatCurrencyCents,
    },
    { label: "Ativos na carteira", value: totals.assetCount, format: (value) => String(Math.round(value)) },
    {
      label: "Rentabilidade",
      value: totals.profitPct,
      format: formatPercent,
      tone: totals.profitPct >= 0 ? "gain" : "loss",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <AnimatedNumber
              value={card.value}
              format={card.format}
              className={cn(
                "block text-xl font-semibold tabular-nums",
                card.tone === "gain" && "text-gain",
                card.tone === "loss" && "text-loss"
              )}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
