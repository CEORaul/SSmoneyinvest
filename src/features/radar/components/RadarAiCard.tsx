import { Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRadarSummaryForProfile } from "@/features/radar/summary"

interface RadarAiCardProps {
  profileId: string
}

/// "IA Financeira" — async Server Component, wrapped in <Suspense> by its
/// caller (page.tsx) so a slow/failed generation never blocks the rest of
/// the already-fetched real data. Shares the exact same cached row as the
/// "Radar do Dia" button (getRadarSummaryForProfile is keyed by profileId
/// alone) — whichever surface the user hits first warms the cache for the
/// other, so this never double-generates or re-derives its own facts.
export async function RadarAiCard({ profileId }: RadarAiCardProps) {
  const summary = await getRadarSummaryForProfile(profileId)

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          IA Financeira
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summary ? (
          <p className="text-sm leading-relaxed">{summary.text}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Resumo indisponível no momento.</p>
        )}
      </CardContent>
    </Card>
  )
}
