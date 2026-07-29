import "server-only"

import { Prisma } from "@/generated/prisma/client"
import { getFavoriteCompanies } from "@/features/company/queries"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { getWatchlistedCompanyIds } from "@/features/watchlist/queries"
import { ensureBucketsFresh } from "@/features/news/news-cache-service"
import { getBucketSpecsForTab, type NewsTabKey } from "@/features/news/query-specs"
import type { NewsArticleRow, NewsFeedFilters, NewsFeedResult, NewsMatchedCompany } from "@/features/news/types"
import { prisma } from "@/lib/prisma"

const DEFAULT_LIMIT = 20

const ARTICLE_INCLUDE = {
  companyLinks: {
    include: {
      company: {
        select: {
          id: true,
          ticker: true,
          name: true,
          logoUrl: true,
          assetClass: true,
          priceSource: true,
          priceCents: true,
        },
      },
    },
  },
} satisfies Prisma.NewsArticleInclude

type NewsArticleWithLinks = Prisma.NewsArticleGetPayload<{ include: typeof ARTICLE_INCLUDE }>

function dateRangeToSince(range: NewsFeedFilters["dateRange"]): Date | null {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  switch (range) {
    case "hoje":
      return new Date(now - day)
    case "7dias":
      return new Date(now - 7 * day)
    case "30dias":
      return new Date(now - 30 * day)
    default:
      return null
  }
}

function applySharedFilters(where: Prisma.NewsArticleWhereInput, filters: NewsFeedFilters, search?: string): void {
  if (filters.topics.length > 0) where.topics = { hasSome: filters.topics }

  const since = dateRangeToSince(filters.dateRange)
  if (since) where.publishedAt = { gte: since }

  const query = search?.trim()
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { sourceName: { contains: query, mode: "insensitive" } },
      {
        companyLinks: {
          some: {
            company: {
              OR: [
                { ticker: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
              ],
            },
          },
        },
      },
    ]
  }
}

/// Personal context used to compute per-company `isOwned`/`isWatchlisted`/
/// `isFavorited` flags (the card's "relevante para você" banner) on every
/// tab — fetched once per request, not once per article.
interface PersonalContext {
  ownedCompanyIds: Set<string>
  watchlistedCompanyIds: Set<string>
  favoritedCompanyIds: Set<string>
}

async function getPersonalContext(profileId: string | null): Promise<PersonalContext> {
  if (!profileId) {
    return { ownedCompanyIds: new Set(), watchlistedCompanyIds: new Set(), favoritedCompanyIds: new Set() }
  }

  const [portfolio, watchlistedIds, favorites] = await Promise.all([
    getPortfolioSummary(profileId),
    getWatchlistedCompanyIds(profileId),
    getFavoriteCompanies(profileId),
  ])

  return {
    ownedCompanyIds: new Set(portfolio.positions.filter((p) => Number(p.quantity) > 0).map((p) => p.companyId)),
    watchlistedCompanyIds: new Set(watchlistedIds),
    favoritedCompanyIds: new Set(favorites.map((f) => f.id)),
  }
}

async function hydrateArticles(
  rows: NewsArticleWithLinks[],
  profileId: string | null,
  context: PersonalContext
): Promise<NewsArticleRow[]> {
  let savedArticleIds = new Set<string>()
  if (profileId && rows.length > 0) {
    const saved = await prisma.savedNewsArticle.findMany({
      where: { profileId, articleId: { in: rows.map((row) => row.id) } },
      select: { articleId: true },
    })
    savedArticleIds = new Set(saved.map((row) => row.articleId))
  }

  return rows.map((row) => {
    const matchedCompanies: NewsMatchedCompany[] = row.companyLinks.map((link) => ({
      id: link.company.id,
      ticker: link.company.ticker,
      name: link.company.name,
      logoUrl: link.company.logoUrl,
      assetClass: link.company.assetClass,
      priceSource: link.company.priceSource,
      priceCents: link.company.priceCents,
      isOwned: context.ownedCompanyIds.has(link.companyId),
      isWatchlisted: context.watchlistedCompanyIds.has(link.companyId),
      isFavorited: context.favoritedCompanyIds.has(link.companyId),
    }))

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      content: row.content,
      imageUrl: row.imageUrl,
      author: row.author,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
      url: row.url,
      publishedAt: row.publishedAt.toISOString(),
      topics: row.topics,
      matchedCompanies,
      isSaved: savedArticleIds.has(row.id),
    }
  })
}

/// Offset-based pagination (cursor is just the stringified offset) rather
/// than a keyset cursor — every tab's realistic row count (a shared cache
/// refreshed every 30 min, see news-cache-service.ts) stays in the dozens-
/// to-low-hundreds range, where an OFFSET scan is plenty fast and this is
/// far simpler than juggling a different pagination strategy per tab type.
function parseCursor(cursor: string | null | undefined): number {
  const parsed = cursor ? Number(cursor) : 0
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function buildNextCursor(offset: number, limit: number, returned: number): string | null {
  return returned < limit ? null : String(offset + limit)
}

/// Backs Mercado/FIIs/ETFs/Cripto/Internacional — refreshes every stale
/// bucket for the tab (see news-cache-service.ts) before reading, so the
/// DB is always the single source of truth for what's rendered.
export async function getBucketFeed(
  tab: NewsTabKey,
  opts: { cursor?: string | null; search?: string; filters: NewsFeedFilters; profileId: string | null; limit?: number }
): Promise<NewsFeedResult> {
  const specs = getBucketSpecsForTab(tab)
  await ensureBucketsFresh(specs)

  const limit = opts.limit ?? DEFAULT_LIMIT
  const offset = parseCursor(opts.cursor)
  const buckets = specs.map((spec) => spec.bucket)

  const where: Prisma.NewsArticleWhereInput = { buckets: { hasSome: buckets } }
  applySharedFilters(where, opts.filters, opts.search)

  const rows = await prisma.newsArticle.findMany({
    where,
    include: ARTICLE_INCLUDE,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    skip: offset,
    take: limit,
  })

  const context = await getPersonalContext(opts.profileId)
  return { articles: await hydrateArticles(rows, opts.profileId, context), nextCursor: buildNextCursor(offset, limit, rows.length) }
}

/// Backs Minha Carteira / Monitor de Ativos — a pure filter over whatever's
/// already cached under the topic tabs (see the module doc in
/// query-specs.ts), never its own provider query. If a held/watched
/// company simply hasn't appeared in any refreshed bucket yet, this
/// legitimately returns fewer articles — never fabricated to fill the gap.
export async function getCompanyScopedFeed(
  companyIds: string[],
  opts: { cursor?: string | null; search?: string; filters: NewsFeedFilters; profileId: string | null; limit?: number }
): Promise<NewsFeedResult> {
  if (companyIds.length === 0) return { articles: [], nextCursor: null }

  const limit = opts.limit ?? DEFAULT_LIMIT
  const offset = parseCursor(opts.cursor)

  const where: Prisma.NewsArticleWhereInput = { companyLinks: { some: { companyId: { in: companyIds } } } }
  applySharedFilters(where, opts.filters, opts.search)

  const rows = await prisma.newsArticle.findMany({
    where,
    include: ARTICLE_INCLUDE,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    skip: offset,
    take: limit,
  })

  const context = await getPersonalContext(opts.profileId)
  return { articles: await hydrateArticles(rows, opts.profileId, context), nextCursor: buildNextCursor(offset, limit, rows.length) }
}

/// Distinct companies actually held (quantity > 0) — backs the Minha
/// Carteira tab. A general-purpose helper, not tied to the feed shape, so
/// it's also the natural reuse point for page.tsx's initial SSR fetch.
export async function getOwnedCompanyIds(profileId: string): Promise<string[]> {
  const portfolio = await getPortfolioSummary(profileId)
  return [...new Set(portfolio.positions.filter((p) => Number(p.quantity) > 0).map((p) => p.companyId))]
}

export async function getSavedArticles(
  profileId: string,
  opts: { cursor?: string | null; limit?: number }
): Promise<NewsFeedResult> {
  const limit = opts.limit ?? DEFAULT_LIMIT
  const offset = parseCursor(opts.cursor)

  const saved = await prisma.savedNewsArticle.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit,
    select: { articleId: true },
  })
  if (saved.length === 0) return { articles: [], nextCursor: null }

  const rows = await prisma.newsArticle.findMany({
    where: { id: { in: saved.map((s) => s.articleId) } },
    include: ARTICLE_INCLUDE,
  })
  const byId = new Map(rows.map((row) => [row.id, row]))
  const ordered = saved.map((s) => byId.get(s.articleId)).filter((row): row is NewsArticleWithLinks => row != null)

  const context = await getPersonalContext(profileId)
  return { articles: await hydrateArticles(ordered, profileId, context), nextCursor: buildNextCursor(offset, limit, saved.length) }
}

export async function toggleSavedArticle(profileId: string, articleId: string): Promise<{ saved: boolean }> {
  const existing = await prisma.savedNewsArticle.findUnique({
    where: { profileId_articleId: { profileId, articleId } },
    select: { id: true },
  })

  if (existing) {
    await prisma.savedNewsArticle.delete({ where: { id: existing.id } })
    return { saved: false }
  }

  await prisma.savedNewsArticle.create({ data: { profileId, articleId } })
  return { saved: true }
}

export async function getArticleById(articleId: string): Promise<NewsArticleWithLinks | null> {
  return prisma.newsArticle.findUnique({ where: { id: articleId }, include: ARTICLE_INCLUDE })
}
