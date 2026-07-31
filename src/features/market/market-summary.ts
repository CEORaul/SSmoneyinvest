import "server-only"

import { getTopGainers, getTopLosers } from "@/features/market/queries"
import { aiContentService } from "@/services/ai-content-service"
import { formatCurrencyCents, formatPercent } from "@/utils/format"

const brtDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })

function brtDateKey(date = new Date()): string {
  return brtDateFormatter.format(date)
}

/// Builds the fact list FinIA's "Resumo do Mercado Hoje" is grounded in —
/// real top gainers/losers only, the same never-invent discipline every
/// other buildKnownFactsList-style function in this app follows. Returns
/// [] (never a fabricated sentence) when there's simply nothing priced yet.
function buildMarketFacts(
  gainers: Awaited<ReturnType<typeof getTopGainers>>,
  losers: Awaited<ReturnType<typeof getTopLosers>>
): string[] {
  const facts: string[] = []

  if (gainers.length > 0) {
    facts.push(
      "Maiores altas: " +
        gainers.map((c) => `${c.ticker} (${formatCurrencyCents(c.priceCents)}, ${formatPercent(c.changePct)})`).join(", ")
    )
  }
  if (losers.length > 0) {
    facts.push(
      "Maiores baixas: " +
        losers.map((c) => `${c.ticker} (${formatCurrencyCents(c.priceCents)}, ${formatPercent(c.changePct)})`).join(", ")
    )
  }

  return facts
}

/// Mercado 2.0's "Resumo do Mercado Hoje" card — thin wrapper computing
/// today's America/Sao_Paulo date key and the grounding facts, then
/// delegating to the cached AI layer (regenerates once per calendar day,
/// see getOrGenerateMarketSummary's comparisonKey=dateKey cache shape).
export async function getMarketSummary(): Promise<{ text: string; generatedAt: Date } | null> {
  const [gainers, losers] = await Promise.all([getTopGainers(5), getTopLosers(5)])
  const facts = buildMarketFacts(gainers, losers)
  if (facts.length === 0) return null

  return aiContentService.getOrGenerateMarketSummary(brtDateKey(), facts)
}
