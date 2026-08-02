import "server-only"

import { Prisma } from "@/generated/prisma/client"
import { getAlertedCompanyIds } from "@/features/alerts/queries"
import { NotificationService } from "@/features/alerts/notifications/service"
import { getFavoriteCompanies } from "@/features/company/queries"
import { getPortfolioSummary, type PortfolioPositionRow } from "@/features/portfolio/queries"
import { ensureBucketsFresh, ensureCompanyBucketsFresh } from "@/features/news/news-cache-service"
import { computePerformanceSnapshots } from "@/features/news/performance"
import { buildNewsFacts } from "@/features/news/facts"
import { getNewsSentimentFromFacts } from "@/features/news/sentiment"
import { getBucketSpecsForTab, type NewsTabKey } from "@/features/news/query-specs"
import type {
  NewsArticleRow,
  NewsArticleSentiment,
  NewsFeedFilters,
  NewsFeedResult,
  NewsMatchedCompany,
  NewsPositionSnapshot,
  NewsRelevance,
  NewsRelevanceReason,
} from "@/features/news/types"
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
          priceChangePct: true,
          sector: true,
          // Real per-article fundamentals for buildNewsFacts below — the
          // same Stock relation IndicatorGrid already reads, just narrowed
          // to the handful of facts worth stating next to a news item.
          stock: {
            select: { priceToEarnings: true, roe: true, dividendYield: true, netMargin: true },
          },
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

/// Personal context used to compute per-company `isOwned`/`isAlerted`/
/// `isFavorited` flags (the card's "relevante para você" banner) plus the
/// full position record (for the "Sua posição" block) on every tab —
/// fetched once per request, not once per article.
interface PersonalContext {
  ownedCompanyIds: Set<string>
  alertedCompanyIds: Set<string>
  favoritedCompanyIds: Set<string>
  positionsByCompanyId: Map<string, PortfolioPositionRow>
}

async function getPersonalContext(profileId: string | null): Promise<PersonalContext> {
  if (!profileId) {
    return {
      ownedCompanyIds: new Set(),
      alertedCompanyIds: new Set(),
      favoritedCompanyIds: new Set(),
      positionsByCompanyId: new Map(),
    }
  }

  const [portfolio, alertedIds, favorites] = await Promise.all([
    getPortfolioSummary(profileId),
    getAlertedCompanyIds(profileId),
    getFavoriteCompanies(profileId),
  ])

  const positionsByCompanyId = new Map(
    portfolio.positions.filter((p) => Number(p.quantity) > 0).map((p) => [p.companyId, p] as const)
  )

  return {
    ownedCompanyIds: new Set(positionsByCompanyId.keys()),
    alertedCompanyIds: new Set(alertedIds),
    favoritedCompanyIds: new Set(favorites.map((f) => f.id)),
    positionsByCompanyId,
  }
}

/// Picks the single most relevant matched company for an article's "por que
/// esta notícia importa" block, when it matches several — owned beats
/// alerted beats favorited, since "you hold this" is a stronger reason than
/// "you're just tracking it."
function selectPrimaryCompany(
  matchedCompanies: NewsMatchedCompany[]
): { company: NewsMatchedCompany; reason: NewsRelevanceReason } | null {
  const owned = matchedCompanies.find((c) => c.isOwned)
  if (owned) return { company: owned, reason: "owned" }

  const alerted = matchedCompanies.find((c) => c.isAlerted)
  if (alerted) return { company: alerted, reason: "alerted" }

  const favorited = matchedCompanies.find((c) => c.isFavorited)
  if (favorited) return { company: favorited, reason: "favorited" }

  return null
}

function toPositionSnapshot(position: PortfolioPositionRow | undefined): NewsPositionSnapshot | null {
  if (!position) return null
  return {
    quantity: position.quantity,
    averagePriceCents: position.averagePriceCents,
    currentPriceCents: position.currentPriceCents,
    allocationPct: position.allocationPct,
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

  const hydratedMatches = rows.map((row) => {
    const matchedCompanies: NewsMatchedCompany[] = row.companyLinks.map((link) => ({
      id: link.company.id,
      ticker: link.company.ticker,
      name: link.company.name,
      logoUrl: link.company.logoUrl,
      assetClass: link.company.assetClass,
      priceSource: link.company.priceSource,
      priceCents: link.company.priceCents,
      priceChangePct: Number(link.company.priceChangePct),
      isOwned: context.ownedCompanyIds.has(link.companyId),
      isAlerted: context.alertedCompanyIds.has(link.companyId),
      isFavorited: context.favoritedCompanyIds.has(link.companyId),
    }))

    return { row, matchedCompanies, primary: selectPrimaryCompany(matchedCompanies) }
  })

  // "Desempenho do ativo" is batched ONCE per feed page across only the
  // distinct primary companies actually needed (not every matched company on
  // every card) — see performance.ts.
  const primaryCompaniesById = new Map<string, NewsMatchedCompany>()
  for (const { primary } of hydratedMatches) {
    if (primary) primaryCompaniesById.set(primary.company.id, primary.company)
  }

  // Sentiment/one-line-summary: eager so the badge never waits on a click,
  // cheap because getOrGenerateNewsSentiment is cache-first (a Gemini call
  // only happens on a genuine cache miss) — run every article's lookup in
  // parallel alongside the performance batch. A generation failure just
  // means that one card omits its badge; it never breaks the feed.
  const [performanceByCompanyId, sentimentEntries] = await Promise.all([
    computePerformanceSnapshots([...primaryCompaniesById.values()]),
    Promise.all(
      rows.map(async (row): Promise<[string, NewsArticleSentiment] | null> => {
        const facts = buildNewsFacts(row)
        if (!facts) return null
        const result = await getNewsSentimentFromFacts(row.id, facts)
        return result ? [row.id, { sentiment: result.sentiment, reasons: result.reasons, summary: result.summary }] : null
      })
    ),
  ])
  const sentimentByArticleId = new Map(sentimentEntries.filter((entry): entry is [string, NewsArticleSentiment] => entry !== null))

  const articleRows: NewsArticleRow[] = hydratedMatches.map(({ row, matchedCompanies, primary }) => {
    const relevance: NewsRelevance | null = primary
      ? {
          company: primary.company,
          reason: primary.reason,
          position: toPositionSnapshot(context.positionsByCompanyId.get(primary.company.id)),
          performance: performanceByCompanyId.get(primary.company.id)!,
        }
      : null

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
      sentiment: sentimentByArticleId.get(row.id) ?? null,
      relevance,
    }
  })

  // "Integração com Notícias" (bell spec) — a personalized article (owned/
  // alerted/favorited primary company) notifies the bell too, scoped only
  // to the requesting profile's own feed request (never a fan-out to every
  // user on ingestion, see news-cache-service.ts's persistArticles, which
  // runs for whichever bucket any visitor's page happened to need).
  // sourceKey=articleId makes a repeat page load of the same article a
  // guaranteed no-op; a second, different relevant article about the same
  // company within the day collapses into "TICKER possui N novas notícias"
  // via NotificationService's own group-collapse.
  if (profileId) {
    await Promise.all(
      articleRows
        .filter((article) => article.relevance != null)
        .map((article) => {
          const relevance = article.relevance!
          return NotificationService.create({
            profileId,
            type: "NEWS",
            title: article.title,
            body: article.sentiment?.summary ?? article.description ?? null,
            companyId: relevance.company.id,
            metadata: { articleId: article.id, articleUrl: article.url },
            sourceKey: `news:${article.id}`,
          })
        })
    )
  }

  return articleRows
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

/// Backs Minha Carteira / Alertas — refreshes a dedicated search bucket
/// per held/alerted company (capped, see MAX_COMPANY_BUCKETS in
/// news-cache-service.ts) so these tabs actually find news about the user's
/// own tickers, not just whatever coincidentally showed up in the generic
/// category searches. Still the same honest contract as every other tab:
/// a provider failure or a company simply not being in the news yet
/// legitimately returns fewer articles, never fabricated to fill the gap.
export async function getCompanyScopedFeed(
  companyIds: string[],
  opts: { cursor?: string | null; search?: string; filters: NewsFeedFilters; profileId: string | null; limit?: number }
): Promise<NewsFeedResult> {
  if (companyIds.length === 0) return { articles: [], nextCursor: null }

  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds } },
    select: { ticker: true, name: true },
  })
  await ensureCompanyBucketsFresh(companies)

  const limit = opts.limit ?? DEFAULT_LIMIT
  const offset = parseCursor(opts.cursor)

  // OR'd together, not just companyLinks: an article fetched specifically
  // for "company-PETR4" might not literally contain the string "PETR4" in
  // its title/description (company-matcher.ts missed it), but it was still
  // returned by a search for that exact company and belongs on this tab.
  const companyBucketKeys = companies.map((c) => `company-${c.ticker}`)
  const where: Prisma.NewsArticleWhereInput = {
    AND: [
      {
        OR: [
          { companyLinks: { some: { companyId: { in: companyIds } } } },
          { buckets: { hasSome: companyBucketKeys } },
        ],
      },
    ],
  }
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
