import "server-only"

import type { AssetClass } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { CompanyListItem } from "@/types"

/// Logs a /empresa/[ticker] page view — plain function (not a Server
/// Action) since it's called directly from that page's own Server
/// Component render, never from the client. Best-effort: a logging
/// failure must never break the page it's attached to.
export async function logAssetView(companyId: string, profileId: string | null): Promise<void> {
  try {
    await prisma.searchLog.create({ data: { companyId, profileId, kind: "VIEW" } })
  } catch {
    // Best-effort only — see doc comment above.
  }
}

export interface GlobalSearchResult {
  id: string
  ticker: string
  name: string
  logoUrl: string | null
  assetClass: AssetClass
  sector: string | null
  priceCents: number
  changePct: number
}

const SEARCH_RESULT_SELECT = {
  id: true,
  ticker: true,
  name: true,
  logoUrl: true,
  assetClass: true,
  sector: true,
  priceCents: true,
  priceChangePct: true,
} as const

type SearchResultRow = {
  id: string
  ticker: string
  name: string
  logoUrl: string | null
  assetClass: AssetClass
  sector: string | null
  priceCents: number
  priceChangePct: unknown
}

function toGlobalSearchResult(row: SearchResultRow): GlobalSearchResult {
  return {
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    logoUrl: row.logoUrl,
    assetClass: row.assetClass,
    sector: row.sector,
    priceCents: row.priceCents,
    changePct: Number(row.priceChangePct),
  }
}

/// Relevance order: exact ticker match, then ticker prefix, then name
/// prefix, then any other substring hit — tie-broken by market cap so
/// bigger/more-recognizable companies surface first within the same tier.
/// This is deliberately simple scoring (no external search engine) since
/// the candidate set per query is already small (fast-path result count).
type RankableRow = SearchResultRow & { marketCapCents: bigint | null }

function rankResults(results: RankableRow[], query: string): RankableRow[] {
  const upperQuery = query.toUpperCase()
  const lowerQuery = query.toLowerCase()

  function tier(row: RankableRow): number {
    if (row.ticker.toUpperCase() === upperQuery) return 0
    if (row.ticker.toUpperCase().startsWith(upperQuery)) return 1
    if (row.name.toLowerCase().startsWith(lowerQuery)) return 2
    return 3
  }

  return [...results].sort((a, b) => {
    const tierDiff = tier(a) - tier(b)
    if (tierDiff !== 0) return tierDiff
    return Number(b.marketCapCents ?? BigInt(0)) - Number(a.marketCapCents ?? BigInt(0))
  })
}

const FUZZY_FALLBACK_THRESHOLD = 3
const FUZZY_SIMILARITY_MIN = 0.25

/// The one place every global-search query is built — ticker/nome/setor/
/// segmento, every category at once, never scoped to BRAPI/Yahoo (reads
/// Postgres only). Tiered: fast prefix/contains first (handles the vast
/// majority of real typed queries), falling back to trigram similarity
/// (pg_trgm, enabled by the search_log migration) only when the fast path
/// comes up short — that's what makes "Petobras"/"Itau"/"Mercadolivre"
/// still resolve to the right ticker despite the typo.
export async function searchAssets(query: string, limit = 20): Promise<GlobalSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length === 0) return []

  const fast = await prisma.company.findMany({
    where: {
      OR: [
        { ticker: { startsWith: trimmed, mode: "insensitive" } },
        { name: { contains: trimmed, mode: "insensitive" } },
        { sector: { contains: trimmed, mode: "insensitive" } },
        { segment: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    take: limit * 2,
    select: { ...SEARCH_RESULT_SELECT, marketCapCents: true },
  })

  if (fast.length >= FUZZY_FALLBACK_THRESHOLD) {
    return rankResults(fast, trimmed).slice(0, limit).map(toGlobalSearchResult)
  }

  // Fuzzy fallback — raw SQL because Prisma has no query builder for
  // pg_trgm. Merges with whatever the fast path already found (typos can
  // still partially prefix-match) rather than discarding it. Uses
  // word_similarity for `name` (not similarity/%): a typo'd single word
  // ("Petobras") against a long multi-word company name ("PETROLEO
  // BRASILEIRO S.A. PETROBRAS") scores low under whole-string similarity()
  // — word_similarity instead finds the best-matching substring of `name`,
  // which is what actually makes "Petobras"/"Itau"/"Mercadolivre" resolve.
  // `ticker` stays on similarity() since it's already a short single token.
  const fuzzy = await prisma.$queryRaw<(SearchResultRow & { marketCapCents: bigint | null })[]>`
    SELECT id, ticker, name, "logoUrl", "assetClass", sector, "priceCents", "priceChangePct", "marketCapCents"
    FROM companies
    WHERE word_similarity(${trimmed}, name) > ${FUZZY_SIMILARITY_MIN}
       OR similarity(ticker, ${trimmed}) > ${FUZZY_SIMILARITY_MIN}
    ORDER BY GREATEST(word_similarity(${trimmed}, name), similarity(ticker, ${trimmed})) DESC
    LIMIT ${limit * 2}
  `

  const byId = new Map(
    [...fast, ...fuzzy].map((row) => [row.id, row] as const)
  )
  return rankResults([...byId.values()], trimmed).slice(0, limit).map(toGlobalSearchResult)
}

/// "Mais pesquisados" — a real aggregate over SearchLog SEARCH events in
/// the trailing window, never a hardcoded ticker list. Empty on a cold
/// start (no searches logged yet) rather than fabricating activity; the
/// caller (getPopularCompanies) decides what real fallback to show then.
export async function getTrendingAssets(limit = 6, windowDays = 30): Promise<GlobalSearchResult[]> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  const grouped = await prisma.searchLog.groupBy({
    by: ["companyId"],
    where: { kind: "SEARCH", createdAt: { gte: since } },
    _count: { companyId: true },
    orderBy: { _count: { companyId: "desc" } },
    take: limit,
  })
  if (grouped.length === 0) return []

  const companies = await prisma.company.findMany({
    where: { id: { in: grouped.map((row) => row.companyId) } },
    select: SEARCH_RESULT_SELECT,
  })
  const byId = new Map(companies.map((company) => [company.id, company]))

  return grouped
    .map((row) => byId.get(row.companyId))
    .filter((company): company is NonNullable<typeof company> => company != null)
    .map(toGlobalSearchResult)
}

/// A profile's own last N distinct SEARCH selections, most recent first —
/// backs "Últimas pesquisas" for a logged-in visitor (anonymous visitors
/// use localStorage instead, see GlobalSearch's client-side fallback).
export async function getRecentSearches(profileId: string, limit = 10): Promise<GlobalSearchResult[]> {
  const logs = await prisma.searchLog.findMany({
    where: { profileId, kind: "SEARCH" },
    orderBy: { createdAt: "desc" },
    take: limit * 3, // over-fetch to dedupe by company below
    select: { companyId: true },
  })
  return hydrateDistinctCompanies(logs.map((log) => log.companyId), limit)
}

/// A profile's own last N distinct /empresa/[ticker] views — "Últimos
/// ativos vistos".
export async function getRecentViews(profileId: string, limit = 10): Promise<GlobalSearchResult[]> {
  const logs = await prisma.searchLog.findMany({
    where: { profileId, kind: "VIEW" },
    orderBy: { createdAt: "desc" },
    take: limit * 3,
    select: { companyId: true },
  })
  return hydrateDistinctCompanies(logs.map((log) => log.companyId), limit)
}

async function hydrateDistinctCompanies(companyIds: string[], limit: number): Promise<GlobalSearchResult[]> {
  const distinctIds = [...new Set(companyIds)].slice(0, limit)
  if (distinctIds.length === 0) return []

  const companies = await prisma.company.findMany({
    where: { id: { in: distinctIds } },
    select: SEARCH_RESULT_SELECT,
  })
  const byId = new Map(companies.map((company) => [company.id, company]))

  return distinctIds
    .map((id) => byId.get(id))
    .filter((company): company is NonNullable<typeof company> => company != null)
    .map(toGlobalSearchResult)
}

/// Top companies by real trading volume — one of the three "quando vazio"
/// popularity signals (alongside top gainers and top dividend payers,
/// which already exist in market/queries.ts).
export async function getTopByVolume(limit = 6): Promise<CompanyListItem[]> {
  const companies = await prisma.company.findMany({
    where: { volume: { not: null }, priceCents: { gt: 0 } },
    orderBy: { volume: "desc" },
    take: limit,
  })
  return companies.map((company) => ({
    ticker: company.ticker,
    name: company.name,
    logoUrl: company.logoUrl,
    priceCents: company.priceCents,
    changePct: Number(company.priceChangePct),
    dividendYield: 0,
  }))
}

/// Real, defensible per-category "mega menu" content: top companies by
/// market cap and every distinct sector actually present in the data —
/// never a hand-maintained list, so a category with no real sector spread
/// yet (e.g. Cripto) just shows an empty sector list rather than something
/// invented.
export interface MegaMenuData {
  topCompanies: GlobalSearchResult[]
  sectors: string[]
}

export async function getMegaMenuData(assetClass: AssetClass, limit = 6): Promise<MegaMenuData> {
  const [topCompanies, sectorRows] = await Promise.all([
    prisma.company.findMany({
      where: { assetClass, priceCents: { gt: 0 } },
      orderBy: { marketCapCents: "desc" },
      take: limit,
      select: SEARCH_RESULT_SELECT,
    }),
    prisma.company.findMany({
      where: { assetClass, sector: { not: null } },
      distinct: ["sector"],
      select: { sector: true },
      orderBy: { sector: "asc" },
    }),
  ])

  return {
    topCompanies: topCompanies.map(toGlobalSearchResult),
    sectors: sectorRows.map((row) => row.sector).filter((sector): sector is string => sector != null),
  }
}
