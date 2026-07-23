import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TickerBadge } from "@/components/shared/TickerBadge"
import type { TimelineEvent } from "@/features/portfolio/analytics"
import { formatCurrencyCents, formatDate } from "@/utils/format"

interface DividendsRadarSectionProps {
  recentIncomeEvents: TimelineEvent[]
  dividendsReceivedThisMonthCents: number
}

/// "Radar de Dividendos" — dividendos recebidos and JSCP are real
/// (Transaction-derived, same data getPortfolioTimeline already produced);
/// "Próximos pagamentos"/"Dividendos previstos" have no
/// future-announcement data source yet, so they're honest stubs.
export function DividendsRadarSection({
  recentIncomeEvents,
  dividendsReceivedThisMonthCents,
}: DividendsRadarSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Radar de Dividendos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">Recebidos este mês</p>
            <p className="font-medium tabular-nums">{formatCurrencyCents(dividendsReceivedThisMonthCents)}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">Próximos pagamentos</p>
            <p className="text-sm text-muted-foreground">Em breve</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">Dividendos previstos</p>
            <p className="text-sm text-muted-foreground">Em breve</p>
          </div>
        </div>

        {recentIncomeEvents.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Recebidos recentemente</p>
            {recentIncomeEvents.slice(0, 6).map((event) => (
              <Link
                key={event.id}
                href={`/empresa/${event.ticker}`}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent/60"
              >
                <TickerBadge ticker={event.ticker} logoUrl={event.logoUrl} size="sm" />
                <span className="flex-1 truncate">{event.type === "JCP" ? "JSCP" : "Dividendo"}</span>
                <span className="text-xs text-muted-foreground">{formatDate(event.date)}</span>
                <span className="font-medium tabular-nums">{formatCurrencyCents(event.totalCents)}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
