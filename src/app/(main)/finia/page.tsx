import { FiniaPageClient } from "@/features/finia/components/FiniaPageClient"
import { getConversationsForProfile } from "@/features/finia/queries"
import { getAlertsForProfile } from "@/features/alerts/queries"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { computePortfolioScore } from "@/features/portfolio/score/compute-score"
import { requireUser } from "@/lib/auth/session"

function greetingForHour(hour: number): string {
  if (hour < 12) return "Bom dia."
  if (hour < 18) return "Boa tarde."
  return "Boa noite."
}

export default async function FiniaPage() {
  const profile = await requireUser()

  const [summary, alerts, conversationsResult] = await Promise.all([
    getPortfolioSummary(profile.id),
    getAlertsForProfile(profile.id),
    getConversationsForProfile(profile.id),
  ])

  const scoreResult = computePortfolioScore(summary)
  const activeAlertsCount = alerts.filter((a) => a.status === "ACTIVE").length

  // Brazil doesn't observe DST anymore, so a fixed UTC-3 offset is accurate
  // — this is purely a cosmetic greeting, not used for anything financial.
  const brtHour = (new Date().getUTCHours() + 21) % 24

  return (
    <FiniaPageClient
      initialConversations={conversationsResult.conversations}
      greeting={greetingForHour(brtHour)}
      summary={{
        patrimonyCents: summary.totals.currentValueCents,
        profitPct: summary.totals.profitPct,
        dividendsReceivedCents: summary.totals.dividendsReceivedCents,
        assetCount: summary.totals.assetCount,
        activeAlertsCount,
        score: scoreResult?.score ?? null,
        scoreBucket: scoreResult?.bucket ?? null,
      }}
    />
  )
}
