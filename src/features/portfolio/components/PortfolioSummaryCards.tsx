import { Card, CardContent } from "@/components/ui/card"
import type { PortfolioTotals } from "@/features/portfolio/queries"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatPercent } from "@/utils/format"

interface PortfolioSummaryCardsProps {
  totals: PortfolioTotals
}

export function PortfolioSummaryCards({ totals }: PortfolioSummaryCardsProps) {
  const cards: { label: string; value: string; tone?: "gain" | "loss" }[] = [
    { label: "Patrimônio", value: formatCurrencyCents(totals.currentValueCents) },
    {
      label: "Lucro/Prejuízo",
      value: formatCurrencyCents(totals.profitCents),
      tone: totals.profitCents >= 0 ? "gain" : "loss",
    },
    { label: "Dividendos recebidos", value: formatCurrencyCents(totals.dividendsReceivedCents) },
    { label: "Ativos na carteira", value: String(totals.assetCount) },
    {
      label: "Rentabilidade",
      value: formatPercent(totals.profitPct),
      tone: totals.profitPct >= 0 ? "gain" : "loss",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p
              className={cn(
                "text-xl font-semibold tabular-nums",
                card.tone === "gain" && "text-gain",
                card.tone === "loss" && "text-loss"
              )}
            >
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
