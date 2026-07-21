import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CotacaoStatsDTO } from "@/features/company/queries"
import { formatCompactNumber, formatCurrencyCents } from "@/utils/format"

interface CotacaoStatsCardProps {
  stats: CotacaoStatsDTO
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value ?? "—"}</span>
    </div>
  )
}

export function CotacaoStatsCard({ stats }: CotacaoStatsCardProps) {
  const trackedSince = stats.trackedSinceDate
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
        stats.trackedSinceDate
      )
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cotação</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Máxima do dia" value={stats.dayHighCents != null ? formatCurrencyCents(stats.dayHighCents) : null} />
        <Stat label="Mínima do dia" value={stats.dayLowCents != null ? formatCurrencyCents(stats.dayLowCents) : null} />
        <Stat label="Volume" value={stats.volume != null ? formatCompactNumber(stats.volume) : null} />
        <Stat
          label="Máxima 52 semanas"
          value={stats.fiftyTwoWeekHighCents != null ? formatCurrencyCents(stats.fiftyTwoWeekHighCents) : null}
        />
        <Stat
          label="Mínima 52 semanas"
          value={stats.fiftyTwoWeekLowCents != null ? formatCurrencyCents(stats.fiftyTwoWeekLowCents) : null}
        />
        <div />
        <Stat
          label={trackedSince ? `Máxima desde ${trackedSince}` : "Máxima registrada"}
          value={stats.trackedHighCents != null ? formatCurrencyCents(stats.trackedHighCents) : null}
        />
        <Stat
          label={trackedSince ? `Mínima desde ${trackedSince}` : "Mínima registrada"}
          value={stats.trackedLowCents != null ? formatCurrencyCents(stats.trackedLowCents) : null}
        />
      </CardContent>
    </Card>
  )
}
