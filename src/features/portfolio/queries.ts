import "server-only"

import type { AssetClass } from "@/generated/prisma/client"
import { getTrailingDividendYieldMap } from "@/features/market/dividend-yield"
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

export interface PortfolioSummary {
  positions: PortfolioPositionRow[]
  totals: PortfolioTotals
}

const EMPTY_TOTALS: PortfolioTotals = {
  investedCents: 0,
  currentValueCents: 0,
  profitCents: 0,
  profitPct: 0,
  dividendsReceivedCents: 0,
  assetCount: 0,
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
    return { positions: [], totals: EMPTY_TOTALS }
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

/// Backs the autocomplete in "Adicionar Ativo" — search by ticker prefix
/// or company name substring, whichever the user typed.
export async function searchCompanies(query: string, limit = 8): Promise<CompanySearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length === 0) return []

  return prisma.company.findMany({
    where: {
      OR: [
        { ticker: { startsWith: trimmed, mode: "insensitive" } },
        { name: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    orderBy: { ticker: "asc" },
    take: limit,
    select: { id: true, ticker: true, name: true, assetClass: true, logoUrl: true, priceCents: true },
  })
}

export async function getPositionTransactions(profileId: string, companyId: string) {
  return prisma.transaction.findMany({
    where: { profileId, companyId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  })
}
