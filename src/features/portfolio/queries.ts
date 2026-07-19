import "server-only"

import type { AssetClass } from "@/generated/prisma/client"
import { getTrailingDividendYieldMap } from "@/features/market/dividend-yield"
import { ASSET_CATEGORIES } from "@/features/portfolio/asset-category"
import { prisma } from "@/lib/prisma"

export interface PortfolioPositionRow {
  id: string
  companyId: string
  ticker: string
  name: string
  logoUrl: string | null
  assetClass: AssetClass
  quantity: string
  averagePriceCents: number
  currentPriceCents: number
  priceChangePct: number
  investedCents: number
  currentValueCents: number
  profitCents: number
  profitPct: number
  dividendYieldPct: number
  dividendsReceivedCents: number
  allocationPct: number
  lastUpdatedAt: Date
}

export interface PortfolioTotals {
  investedCents: number
  currentValueCents: number
  profitCents: number
  profitPct: number
  dividendsReceivedCents: number
  assetCount: number
}

export interface PortfolioCategoryGroup {
  category: AssetClass
  positions: PortfolioPositionRow[]
  totals: PortfolioTotals & { dailyChangePct: number; allocationPct: number }
}

export interface PortfolioSummary {
  positions: PortfolioPositionRow[]
  totals: PortfolioTotals
  byCategory: PortfolioCategoryGroup[]
}

const EMPTY_TOTALS: PortfolioTotals = {
  investedCents: 0,
  currentValueCents: 0,
  profitCents: 0,
  profitPct: 0,
  dividendsReceivedCents: 0,
  assetCount: 0,
}

/// Groups already-computed position rows by category — reuses the exact
/// same per-position figures (no re-computation, no category-specific
/// logic) and just aggregates them. This is what lets a brand new
/// AssetClass value "just work" here: nothing in this function branches on
/// which category it is.
function groupPositionsByCategory(
  positionRows: PortfolioPositionRow[],
  portfolioCurrentValueCents: number
): PortfolioCategoryGroup[] {
  const byCategory = new Map<AssetClass, PortfolioPositionRow[]>()
  for (const row of positionRows) {
    const existing = byCategory.get(row.assetClass)
    if (existing) existing.push(row)
    else byCategory.set(row.assetClass, [row])
  }

  const groups = ASSET_CATEGORIES.map((category) => {
    const rows = byCategory.get(category.value)
    if (!rows || rows.length === 0) return null

    const investedCents = rows.reduce((sum, row) => sum + row.investedCents, 0)
    const currentValueCents = rows.reduce((sum, row) => sum + row.currentValueCents, 0)
    const profitCents = currentValueCents - investedCents
    const dividendsReceivedCents = rows.reduce((sum, row) => sum + row.dividendsReceivedCents, 0)
    // Value-weighted so one large holding's daily move dominates
    // appropriately rather than every position counting equally.
    const dailyChangePct =
      currentValueCents > 0
        ? rows.reduce((sum, row) => sum + row.priceChangePct * row.currentValueCents, 0) /
          currentValueCents
        : 0

    const group: PortfolioCategoryGroup = {
      category: category.value,
      positions: rows.sort((a, b) => b.currentValueCents - a.currentValueCents),
      totals: {
        investedCents,
        currentValueCents,
        profitCents,
        profitPct: investedCents > 0 ? (profitCents / investedCents) * 100 : 0,
        dividendsReceivedCents,
        assetCount: rows.length,
        dailyChangePct,
        allocationPct:
          portfolioCurrentValueCents > 0
            ? (currentValueCents / portfolioCurrentValueCents) * 100
            : 0,
      },
    }
    return group
  })

  return groups.filter((group): group is PortfolioCategoryGroup => group !== null)
}

/// Every figure here is derived at read time from PortfolioPosition (kept
/// correct by portfolio-service's replay engine) and Company's live-synced
/// price — never recomputed client-side.
export async function getPortfolioSummary(profileId: string): Promise<PortfolioSummary> {
  const positions = await prisma.portfolioPosition.findMany({
    where: { profileId, quantity: { gt: 0 } },
    include: { company: true },
  })

  if (positions.length === 0) {
    return { positions: [], totals: EMPTY_TOTALS, byCategory: [] }
  }

  const dividendYields = await getTrailingDividendYieldMap(
    positions.map((position) => ({
      id: position.companyId,
      priceCents: position.company.priceCents,
    }))
  )

  const computed = positions.map((position) => {
    const currentValueCents = position.quantity.mul(position.company.priceCents).round().toNumber()
    const investedCents = Number(position.totalInvestedCents)
    const profitCents = currentValueCents - investedCents
    const profitPct = investedCents > 0 ? (profitCents / investedCents) * 100 : 0

    return { position, currentValueCents, investedCents, profitCents, profitPct }
  })

  const totalCurrentValueCents = computed.reduce((sum, row) => sum + row.currentValueCents, 0)

  const positionRows: PortfolioPositionRow[] = computed.map(
    ({ position, currentValueCents, investedCents, profitCents, profitPct }) => ({
      id: position.id,
      companyId: position.companyId,
      ticker: position.company.ticker,
      name: position.company.name,
      logoUrl: position.company.logoUrl,
      assetClass: position.company.assetClass,
      quantity: position.quantity.toString(),
      averagePriceCents: position.averagePriceCents,
      currentPriceCents: position.company.priceCents,
      priceChangePct: Number(position.company.priceChangePct),
      investedCents,
      currentValueCents,
      profitCents,
      profitPct,
      dividendYieldPct: dividendYields.get(position.companyId) ?? 0,
      dividendsReceivedCents: Number(position.totalDividendsCents),
      allocationPct:
        totalCurrentValueCents > 0 ? (currentValueCents / totalCurrentValueCents) * 100 : 0,
      lastUpdatedAt: position.company.updatedAt,
    })
  )

  const totalInvestedCents = positionRows.reduce((sum, row) => sum + row.investedCents, 0)
  const totalProfitCents = totalCurrentValueCents - totalInvestedCents
  const totalDividendsCents = positionRows.reduce(
    (sum, row) => sum + row.dividendsReceivedCents,
    0
  )

  return {
    positions: positionRows.sort((a, b) => b.currentValueCents - a.currentValueCents),
    totals: {
      investedCents: totalInvestedCents,
      currentValueCents: totalCurrentValueCents,
      profitCents: totalProfitCents,
      profitPct: totalInvestedCents > 0 ? (totalProfitCents / totalInvestedCents) * 100 : 0,
      dividendsReceivedCents: totalDividendsCents,
      assetCount: positionRows.length,
    },
    byCategory: groupPositionsByCategory(positionRows, totalCurrentValueCents),
  }
}

export interface CompanySearchResult {
  id: string
  ticker: string
  name: string
  assetClass: AssetClass
  logoUrl: string | null
  priceCents: number
}

const COMPANY_SEARCH_RESULT_SELECT = {
  id: true,
  ticker: true,
  name: true,
  assetClass: true,
  logoUrl: true,
  priceCents: true,
} as const

/// Backs the autocomplete in "Adicionar Investimento" — search by ticker
/// prefix or company name substring, optionally scoped to one category (the
/// dialog always scopes it once a category is picked).
export async function searchCompanies(
  query: string,
  assetClass?: AssetClass,
  limit = 8
): Promise<CompanySearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length === 0) return []

  return prisma.company.findMany({
    where: {
      ...(assetClass ? { assetClass } : {}),
      OR: [
        { ticker: { startsWith: trimmed, mode: "insensitive" } },
        { name: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    orderBy: { ticker: "asc" },
    take: limit,
    select: COMPANY_SEARCH_RESULT_SELECT,
  })
}

export async function getPositionTransactions(profileId: string, companyId: string) {
  return prisma.transaction.findMany({
    where: { profileId, companyId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  })
}

/// For categories with no market-data provider (Cripto/Renda Fixa/Outros) —
/// the portfolio's "Adicionar Investimento" flow creates a bare Company row
/// on the fly instead of picking one from a synced directory. Idempotent by
/// ticker: re-adding the same identifier in the same category reuses the
/// existing row rather than erroring.
export async function findOrCreateManualCompany(input: {
  ticker: string
  name: string
  assetClass: Extract<AssetClass, "CRYPTO" | "FIXED_INCOME" | "OTHER">
}): Promise<CompanySearchResult> {
  const existing = await prisma.company.findUnique({
    where: { ticker: input.ticker },
    select: COMPANY_SEARCH_RESULT_SELECT,
  })
  if (existing) {
    if (existing.assetClass !== input.assetClass) {
      throw new Error(
        `"${input.ticker}" já existe na categoria ${existing.assetClass}, não em ${input.assetClass}.`
      )
    }
    return existing
  }

  return prisma.company.create({
    data: {
      ticker: input.ticker,
      name: input.name,
      assetClass: input.assetClass,
      priceCents: 0,
    },
    select: COMPANY_SEARCH_RESULT_SELECT,
  })
}
