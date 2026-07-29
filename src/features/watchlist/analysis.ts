import "server-only"

import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import { translateSector } from "@/features/company/sector-labels"
import { getWatchlistItems } from "@/features/watchlist/queries"
import { aiContentService } from "@/services/ai-content-service"

/// Builds the fact list "✨ Analisar Watchlist" is grounded in — every line
/// comes straight from getWatchlistItems (already-fetched, already-honest
/// real data), never re-derived or estimated here. Returns null when the
/// list is empty so the caller never prompts the model with nothing to say.
async function buildWatchlistFacts(watchlistId: string, profileId: string): Promise<string[] | null> {
  const items = await getWatchlistItems(watchlistId, profileId)
  if (items.length === 0) return null

  const facts = items.map((item) => {
    const parts = [
      `${item.ticker} (${item.name}, ${getAssetCategoryMeta(item.assetClass).label})`,
      `preço R$ ${(item.priceCents / 100).toFixed(2)}`,
      `variação diária ${item.dailyChangePct.toFixed(2)}%`,
    ]
    if (item.weeklyChangePct != null) parts.push(`variação semanal ${item.weeklyChangePct.toFixed(2)}%`)
    if (item.monthlyChangePct != null) parts.push(`variação mensal ${item.monthlyChangePct.toFixed(2)}%`)
    if (item.sector) parts.push(`setor ${translateSector(item.sector)}`)
    parts.push(`Dividend Yield ${item.dividendYieldPct.toFixed(2)}%`)
    return parts.join(", ")
  })

  return [`A Watchlist contém ${items.length} ativo(s):`, ...facts]
}

export async function getWatchlistAnalysis(
  watchlistId: string,
  profileId: string
): Promise<{ text: string; generatedAt: Date } | null> {
  const facts = await buildWatchlistFacts(watchlistId, profileId)
  if (!facts) return null
  return aiContentService.getOrGenerateWatchlistAnalysis(profileId, watchlistId, facts)
}
