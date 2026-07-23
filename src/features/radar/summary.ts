import "server-only"

import { getDividendsReceivedThisMonth } from "@/features/portfolio/analytics"
import { computeTopMovers } from "@/features/portfolio/insights"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { computePortfolioDailyChangePct } from "@/features/radar/insights"
import { aiContentService } from "@/services/ai-content-service"

/// Shared by the "Radar do Dia" button action (radar/actions.ts) and the
/// "IA Financeira" card (RadarAiCard.tsx) — one place builds the fact list
/// and calls the cache-or-generate service, so neither surface re-derives
/// its own version of "what counts as today's facts."
export async function getRadarSummaryForProfile(
  profileId: string
): Promise<{ text: string; generatedAt: Date } | null> {
  const [{ positions, totals }, dividendsReceivedThisMonthCents] = await Promise.all([
    getPortfolioSummary(profileId),
    getDividendsReceivedThisMonth(profileId),
  ])
  if (positions.length === 0) return null

  const topMovers = computeTopMovers(positions)
  const dailyChangePct = computePortfolioDailyChangePct(positions, totals.currentValueCents)

  const facts: string[] = [
    `Patrimônio atual: ${(totals.currentValueCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    `Variação da carteira hoje: ${dailyChangePct.toFixed(2)}%`,
  ]
  if (topMovers.biggestGainer) {
    facts.push(`Maior alta do dia: ${topMovers.biggestGainer.position.ticker} (${topMovers.biggestGainer.value.toFixed(2)}%)`)
  }
  if (topMovers.biggestLoser) {
    facts.push(`Maior queda do dia: ${topMovers.biggestLoser.position.ticker} (${topMovers.biggestLoser.value.toFixed(2)}%)`)
  }
  if (dividendsReceivedThisMonthCents > 0) {
    facts.push(
      `Dividendos recebidos este mês: ${(dividendsReceivedThisMonthCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
    )
  }

  return aiContentService.getOrGenerateRadarSummary(profileId, facts)
}
