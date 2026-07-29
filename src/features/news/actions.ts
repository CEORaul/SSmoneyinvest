"use server"

import { getBucketFeed, getCompanyScopedFeed, getPersonalizedFeed, getSavedArticles, toggleSavedArticle } from "@/features/news/queries"
import type { NewsTabKey } from "@/features/news/query-specs"
import { getNewsSummary } from "@/features/news/summary"
import { DEFAULT_NEWS_FEED_FILTERS, type NewsFeedFilters, type NewsFeedResult } from "@/features/news/types"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { getWatchlistedCompanyIds } from "@/features/watchlist/queries"
import { requireUser } from "@/lib/auth/session"

export interface NewsFeedActionInput {
  tab: NewsTabKey
  cursor?: string | null
  search?: string
  filters?: NewsFeedFilters
}

/// One entry point for every tab, including the personalized/company-
/// scoped ones — the client always calls this same action on tab switch,
/// search, filter change, and "load more," never a per-tab action. Bucket
/// tabs (Mercado/FIIs/ETFs/Cripto/Internacional) refresh their cache here
/// if stale (see getBucketFeed → ensureBucketsFresh); the personalized tabs
/// never call the provider themselves, only filter what's already cached.
export async function getNewsFeedAction(input: NewsFeedActionInput): Promise<NewsFeedResult> {
  const profile = await requireUser()
  const filters = input.filters ?? DEFAULT_NEWS_FEED_FILTERS
  const shared = { cursor: input.cursor, search: input.search, filters }

  switch (input.tab) {
    case "para-voce":
      return getPersonalizedFeed(profile.id, shared)

    case "carteira": {
      const portfolio = await getPortfolioSummary(profile.id)
      const companyIds = [
        ...new Set(portfolio.positions.filter((p) => Number(p.quantity) > 0).map((p) => p.companyId)),
      ]
      return getCompanyScopedFeed(companyIds, { ...shared, profileId: profile.id })
    }

    case "watchlist": {
      const companyIds = await getWatchlistedCompanyIds(profile.id)
      return getCompanyScopedFeed(companyIds, { ...shared, profileId: profile.id })
    }

    default:
      return getBucketFeed(input.tab, { ...shared, profileId: profile.id })
  }
}

export async function toggleSaveNewsArticleAction(
  articleId: string
): Promise<{ ok: boolean; saved?: boolean; error?: string }> {
  const profile = await requireUser()
  try {
    const result = await toggleSavedArticle(profile.id, articleId)
    return { ok: true, saved: result.saved }
  } catch {
    return { ok: false, error: "Não foi possível salvar a notícia." }
  }
}

export async function getSavedNewsAction(cursor?: string | null): Promise<NewsFeedResult> {
  const profile = await requireUser()
  return getSavedArticles(profile.id, { cursor })
}

export async function requestNewsSummaryAction(
  articleId: string
): Promise<{ ok: boolean; text?: string; generatedAt?: string; error?: string }> {
  await requireUser()

  const result = await getNewsSummary(articleId)
  if (!result) return { ok: false, error: "Não há texto suficiente nesta notícia para gerar um resumo." }

  return { ok: true, text: result.text, generatedAt: result.generatedAt.toISOString() }
}
