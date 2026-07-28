import { Bell, Gauge, LineChart, PiggyBank, Wallet } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { formatCurrencyCents, formatPercent } from "@/utils/format"

interface PlatformSummaryPanelProps {
  patrimonyCents: number
  profitPct: number
  dividendsReceivedCents: number
  assetCount: number
  activeAlertsCount: number
  score: number | null
  scoreBucket: string | null
}

interface StatTile {
  icon: React.ReactNode
  label: string
  value: string
  valueClassName?: string
}

/// The "tela inicial" dashboard — every number here is a prop passed down
/// from the /finia page's own server-side fetch (getPortfolioSummary,
/// computePortfolioScore, getAlertsForProfile), the exact same real data
/// FinIA's own context.ts feeds into the model. Never a second, possibly
/// stale computation.
export function PlatformSummaryPanel({
  patrimonyCents,
  profitPct,
  dividendsReceivedCents,
  assetCount,
  activeAlertsCount,
  score,
  scoreBucket,
}: PlatformSummaryPanelProps) {
  const tiles: StatTile[] = [
    { icon: <Wallet className="size-4" />, label: "Patrimônio", value: formatCurrencyCents(patrimonyCents) },
    {
      icon: <LineChart className="size-4" />,
      label: "Rentabilidade",
      value: formatPercent(profitPct),
      valueClassName: profitPct >= 0 ? "text-gain" : "text-loss",
    },
    { icon: <PiggyBank className="size-4" />, label: "Dividendos recebidos", value: formatCurrencyCents(dividendsReceivedCents) },
    { icon: <Wallet className="size-4" />, label: "Quantidade de ativos", value: String(assetCount) },
    { icon: <Bell className="size-4" />, label: "Alertas ativos", value: String(activeAlertsCount) },
    {
      icon: <Gauge className="size-4" />,
      label: "Score da carteira",
      value: score != null ? `${score}/100 (${scoreBucket})` : "Sem dados ainda",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="flex flex-col gap-1 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {tile.icon}
              {tile.label}
            </div>
            <p className={`text-base font-semibold tabular-nums ${tile.valueClassName ?? ""}`}>{tile.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
