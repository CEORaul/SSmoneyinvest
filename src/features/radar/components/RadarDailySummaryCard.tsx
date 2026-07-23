import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadarAiSummaryButton } from "@/features/radar/components/RadarAiSummaryButton"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatPercent } from "@/utils/format"

interface RadarDailySummaryCardProps {
  dailyChangePct: number
  biggestGainer: { ticker: string; value: number } | null
  biggestLoser: { ticker: string; value: number } | null
  dividendsReceivedThisMonthCents: number
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Bom dia!"
  if (hour < 18) return "Boa tarde!"
  return "Boa noite!"
}

/// "Radar do Dia" — every stat here is already computed (reused, never
/// re-derived) by radar/actions.ts's caller in page.tsx; "Resultados desta
/// semana"/"Dividendos previstos" have no data source yet, so they're
/// honest stubs, never a guessed number.
export function RadarDailySummaryCard({
  dailyChangePct,
  biggestGainer,
  biggestLoser,
  dividendsReceivedThisMonthCents,
}: RadarDailySummaryCardProps) {
  const isUp = dailyChangePct >= 0

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-xl">Radar do Dia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base">
          {greeting()} Hoje sua carteira{" "}
          <span className={cn("font-semibold", isUp ? "text-gain" : "text-loss")}>
            {isUp ? "valorizou" : "desvalorizou"} {formatPercent(Math.abs(dailyChangePct))}
          </span>
          .
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Maior alta</p>
            {biggestGainer ? (
              <Link
                href={`/empresa/${biggestGainer.ticker}`}
                className="flex items-center gap-1 font-medium text-gain hover:underline"
              >
                <ArrowUpRight className="size-3.5" />
                {biggestGainer.ticker} {formatPercent(biggestGainer.value)}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Maior queda</p>
            {biggestLoser ? (
              <Link
                href={`/empresa/${biggestLoser.ticker}`}
                className="flex items-center gap-1 font-medium text-loss hover:underline"
              >
                <ArrowDownRight className="size-3.5" />
                {biggestLoser.ticker} {formatPercent(biggestLoser.value)}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dividendos previstos</p>
            <p className="text-sm text-muted-foreground">Em breve</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Resultados esta semana</p>
            <p className="text-sm text-muted-foreground">Aguardando integração</p>
          </div>
        </div>

        {dividendsReceivedThisMonthCents > 0 && (
          <p className="text-sm text-muted-foreground">
            Você recebeu{" "}
            <span className="font-medium text-foreground">
              {formatCurrencyCents(dividendsReceivedThisMonthCents)}
            </span>{" "}
            em dividendos este mês.
          </p>
        )}

        <RadarAiSummaryButton />
      </CardContent>
    </Card>
  )
}
