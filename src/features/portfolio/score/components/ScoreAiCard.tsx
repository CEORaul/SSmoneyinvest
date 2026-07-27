import { Sparkles } from "lucide-react"

import { getScoreSummaryForProfile } from "@/features/portfolio/score/summary"

interface ScoreAiCardProps {
  profileId: string
}

/// "Resumo da IA" under the score gauge — async Server Component, wrapped
/// in <Suspense> by ScoreAiCardSuspense so a slow/failed generation never
/// blocks the gauge/breakdown, which already rendered from real data.
/// Never a buy/sell recommendation — enforced in the prompt itself
/// (ai-content-service.ts's getOrGenerateScoreSummary).
export async function ScoreAiCard({ profileId }: ScoreAiCardProps) {
  const summary = await getScoreSummaryForProfile(profileId)

  return (
    <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
      {summary ? (
        <p className="text-sm leading-relaxed">{summary.text}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Resumo indisponível no momento.</p>
      )}
    </div>
  )
}
