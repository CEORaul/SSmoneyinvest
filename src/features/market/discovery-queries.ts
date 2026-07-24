import "server-only"

import { Prisma, type AssetClass } from "@/generated/prisma/client"
import { getTrailingDividendYieldMap } from "@/features/market/dividend-yield"
import { prisma } from "@/lib/prisma"
import type { MarketAssetRow, MarketFilters, MarketSearchResult, MarketSortOption } from "@/features/market/discovery-types"

/// Real, structured filtering/sorting over Company (+Stock/Fii/Etf) — the
/// data layer for /mercado. Trailing dividend yield is the one metric that
/// can't be filtered/sorted at the database level (it's computed from
/// DividendPayment rows on every read, not a stored column — see
/// dividend-yield.ts), so a request that needs it takes a distinct code
/// path: fetch a bounded, already-structurally-filtered candidate set,
/// compute yield for that set in one batched query, then filter/sort/
/// paginate in application code. Every other filter/sort runs as a normal
/// Prisma where/orderBy + skip/take, scaling to the full company universe.
///
/// When BRAPI Premium (or any richer source) eventually provides a stored,
/// syncable trailing yield, only buildWhere/buildOrderBy/needsInMemoryPath
/// below need to change — searchMarketAssets's signature and every UI
/// component that calls it stay exactly the same.

const CANDIDATE_CAP = 3000

const COMPANY_INCLUDE = {
  stock: { select: { priceToEarnings: true, priceToBook: true, roe: true } },
  fii: { select: { priceToBook: true } },
} satisfies Prisma.CompanyInclude

type CompanyWithFundamentals = Prisma.CompanyGetPayload<{ include: typeof COMPANY_INCLUDE }>

function needsInMemoryPath(filters: MarketFilters, sort: MarketSortOption): boolean {
  return (
    filters.dyMinPct != null ||
    filters.pagadoraDividendos ||
    sort === "dy-desc" ||
    sort === "dy-asc" ||
    sort === "roe-desc" ||
    sort === "pl-asc"
  )
}

function buildWhere(filters: MarketFilters): Prisma.CompanyWhereInput {
  const and: Prisma.CompanyWhereInput[] = []

  if (filters.categoria !== "TODOS") and.push({ assetClass: filters.categoria as AssetClass })
  if (filters.setor) and.push({ sector: filters.setor })
  if (filters.precoMinCents != null) and.push({ priceCents: { gte: filters.precoMinCents } })
  if (filters.precoMaxCents != null) and.push({ priceCents: { lte: filters.precoMaxCents } })
  if (filters.marketCapMinCents != null) and.push({ marketCapCents: { gte: BigInt(Math.round(filters.marketCapMinCents)) } })
  if (filters.liquidezMin != null) and.push({ volume: { gte: BigInt(Math.round(filters.liquidezMin)) } })
  // Negative P/L (a lossmaking company) is excluded rather than treated as
  // "cheap" — same convention Status Invest/Investidor10 screens use, and
  // still a real, unaltered value for every row that does match.
  if (filters.plMax != null) and.push({ stock: { is: { priceToEarnings: { lte: filters.plMax, gt: 0 } } } })
  if (filters.pvpMax != null) {
    and.push({
      OR: [
        { stock: { is: { priceToBook: { lte: filters.pvpMax, gt: 0 } } } },
        { fii: { is: { priceToBook: { lte: filters.pvpMax, gt: 0 } } } },
      ],
    })
  }
  if (filters.roeMinPct != null) and.push({ stock: { is: { roe: { gte: filters.roeMinPct } } } })

  return and.length > 0 ? { priceCents: { gt: 0 }, AND: and } : { priceCents: { gt: 0 } }
}

function buildOrderBy(sort: MarketSortOption): Prisma.CompanyOrderByWithRelationInput {
  switch (sort) {
    case "change-desc":
      return { priceChangePct: "desc" }
    case "change-asc":
      return { priceChangePct: "asc" }
    case "volume-desc":
      return { volume: { sort: "desc", nulls: "last" } }
    case "marketcap-desc":
      return { marketCapCents: { sort: "desc", nulls: "last" } }
    case "marketcap-asc":
      return { marketCapCents: { sort: "asc", nulls: "last" } }
    case "alfabetica":
      return { name: "asc" }
    case "price-desc":
      return { priceCents: "desc" }
    case "price-asc":
      return { priceCents: "asc" }
    case "relevancia":
    default:
      return { marketCapCents: { sort: "desc", nulls: "last" } }
  }
}

async function hydrateRows(companies: CompanyWithFundamentals[]): Promise<MarketAssetRow[]> {
  const dividendYields = await getTrailingDividendYieldMap(
    companies.map((c) => ({ id: c.id, priceCents: c.priceCents }))
  )

  return companies.map((c) => ({
    id: c.id,
    ticker: c.ticker,
    name: c.name,
    logoUrl: c.logoUrl,
    assetClass: c.assetClass,
    priceSource: c.priceSource,
    sector: c.sector,
    priceCents: c.priceCents,
    priceChangePct: Number(c.priceChangePct),
    dividendYieldPct: dividendYields.get(c.id) ?? 0,
    priceToEarnings: c.stock?.priceToEarnings != null ? Number(c.stock.priceToEarnings) : null,
    priceToBook:
      c.stock?.priceToBook != null
        ? Number(c.stock.priceToBook)
        : c.fii?.priceToBook != null
          ? Number(c.fii.priceToBook)
          : null,
    roe: c.stock?.roe != null ? Number(c.stock.roe) : null,
    marketCapCents: c.marketCapCents,
    volume: c.volume,
  }))
}

/// rows are assumed already hydrated (dividendYieldPct/roe/priceToEarnings
/// populated) — this only reorders/filters what's already real.
function applyInMemory(
  rows: MarketAssetRow[],
  filters: MarketFilters,
  sort: MarketSortOption
): MarketAssetRow[] {
  let result = rows

  if (filters.dyMinPct != null) {
    const min = filters.dyMinPct
    result = result.filter((r) => (r.dividendYieldPct ?? 0) >= min)
  }
  if (filters.pagadoraDividendos) {
    result = result.filter((r) => (r.dividendYieldPct ?? 0) > 0)
  }

  switch (sort) {
    case "dy-desc":
      return [...result].sort((a, b) => (b.dividendYieldPct ?? 0) - (a.dividendYieldPct ?? 0))
    case "dy-asc":
      return [...result].sort((a, b) => (a.dividendYieldPct ?? 0) - (b.dividendYieldPct ?? 0))
    case "roe-desc":
      // Only companies with a real ROE are ranked — a missing value is
      // "unranked," never treated as worse than 0%.
      return result.filter((r) => r.roe != null).sort((a, b) => b.roe! - a.roe!)
    case "pl-asc":
      return result.filter((r) => r.priceToEarnings != null && r.priceToEarnings > 0).sort((a, b) => a.priceToEarnings! - b.priceToEarnings!)
    default:
      return result
  }
}

export async function searchMarketAssets(
  filters: MarketFilters,
  sort: MarketSortOption,
  page: number,
  pageSize: number
): Promise<MarketSearchResult> {
  const where = buildWhere(filters)

  if (!needsInMemoryPath(filters, sort)) {
    const [totalCount, companies] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        orderBy: buildOrderBy(sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: COMPANY_INCLUDE,
      }),
    ])
    return { rows: await hydrateRows(companies), totalCount }
  }

  const candidates = await prisma.company.findMany({
    where,
    orderBy: { marketCapCents: { sort: "desc", nulls: "last" } },
    take: CANDIDATE_CAP,
    include: COMPANY_INCLUDE,
  })
  const hydrated = await hydrateRows(candidates)
  const filtered = applyInMemory(hydrated, filters, sort)

  const start = (page - 1) * pageSize
  return { rows: filtered.slice(start, start + pageSize), totalCount: filtered.length }
}

/// Distinct real sectors across the whole universe (not scoped to a single
/// category) — backs the Setor filter dropdown.
export async function getAllSectors(): Promise<string[]> {
  const rows = await prisma.company.findMany({
    where: { sector: { not: null } },
    distinct: ["sector"],
    select: { sector: true },
    orderBy: { sector: "asc" },
  })
  return rows.map((r) => r.sector).filter((s): s is string => s != null)
}
