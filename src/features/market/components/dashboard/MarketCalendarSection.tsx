import Link from "next/link"
import { CalendarDays } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { getTodayDividendEvents } from "@/features/market/dashboard-queries"
import { formatDate } from "@/utils/format"

const DIVIDEND_TYPE_LABELS: Record<string, string> = {
  DIVIDEND: "Dividendo",
  JCP: "JCP",
  RENDIMENTO: "Rendimento",
}

/// Rows with no real backing data anywhere in this app — same honest gap
/// Radar's own calendar already documents (no earnings-date, assembleia, or
/// fato-relevante sync exists). Shown as genuinely disabled rows explaining
/// why, never a fabricated placeholder date.
const UNAVAILABLE_ROWS = [
  { label: "Resultados", reason: "Datas de divulgação de resultados ainda não são sincronizadas." },
  { label: "Assembleias", reason: "Convocações de assembleia ainda não são sincronizadas." },
  { label: "Fatos relevantes", reason: "Fatos relevantes ainda não são sincronizados." },
  { label: "Eventos econômicos", reason: "Calendário macroeconômico ainda não é sincronizado." },
]

/// Mercado 2.0's "Calendário do Dia" — Dividendos is the one row with real
/// data (DividendPayment.exDate, queried for today in America/Sao_Paulo);
/// every other row the spec asks for has no backing table in this app at
/// all, so it's shown honestly disabled rather than invented.
export async function MarketCalendarSection() {
  const events = await getTodayDividendEvents(8)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          Calendário do Dia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Dividendos (data-com hoje)</p>
          {events.length > 0 ? (
            <div className="space-y-0.5">
              {events.map((event) => (
                <Link
                  key={`${event.companyId}-${event.exDate.toISOString()}`}
                  href={`/empresa/${event.ticker}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
                >
                  <TickerBadge ticker={event.ticker} logoUrl={event.logoUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{event.ticker}</p>
                    <p className="truncate text-xs text-muted-foreground">{DIVIDEND_TYPE_LABELS[event.type] ?? event.type}</p>
                  </div>
                  {event.paymentDate && (
                    <span className="text-xs text-muted-foreground">Pagamento {formatDate(event.paymentDate)}</span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-2 py-3 text-xs text-muted-foreground">Nenhum ativo com data-com de dividendo hoje.</p>
          )}
        </div>

        <div className="space-y-1.5 border-t border-border pt-3">
          {UNAVAILABLE_ROWS.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 opacity-60">
              <span className="text-sm font-medium">{row.label}</span>
              <span className="text-right text-xs text-muted-foreground">{row.reason}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
