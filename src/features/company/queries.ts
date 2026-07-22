import "server-only"

import type { AssetClass } from "@/generated/prisma/client"
import type { CompanyGetPayload } from "@/generated/prisma/models/Company"
import { getTrailingDividendYieldMap } from "@/features/market/dividend-yield"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import { computePositionMetrics } from "@/features/portfolio/position-metrics"
import { prisma } from "@/lib/prisma"
import type { CompanyListItem } from "@/types"

export interface CompanyStockFundamentals {
  priceToEarnings: number | null
  priceToBook: number | null
  roe: number | null
  roic: number | null
  roa: number | null
  dividendYield: number | null
  netMargin: number | null
  grossMargin: number | null
  ebitdaMargin: number | null
  psr: number | null
  evToEbit: number | null
  evToEbitda: number | null
  payout: number | null
  currentLiquidity: number | null
  netDebtToEbitda: number | null
  revenueCagr3y: number | null
  netIncomeCagr3y: number | null
  freeFloatPct: number | null
  beta: number | null
  netDebtCents: bigint | null
  equityCents: bigint | null
  revenueCents: bigint | null
  netIncomeCents: bigint | null
  ebitdaCents: bigint | null
  grossDebtCents: bigint | null
  bookValuePerShareCents: number | null
  sharesOutstanding: bigint | null
}

export interface CompanyFiiFundamentals {
  priceToBook: number | null
  dividendYield: number | null
  netWorthCents: bigint | null
  managementFee: number | null
  vacancyRate: number | null
  propertyCount: number | null
  quotaCount: bigint | null
  administrator: string | null
}

export interface CompanyEtfFundamentals {
  benchmarkIndex: string | null
  expenseRatio: number | null
  navCents: bigint | null
  dividendYield: number | null
}

export interface CompanyDetailDTO {
  id: string
  ticker: string
  name: string
  logoUrl: string | null
  description: string | null
  sector: string | null
  segment: string | null
  assetClass: AssetClass
  currency: string
  priceCents: number
  priceChangePct: number
  marketCapCents: bigint | null
  dayHighCents: number | null
  dayLowCents: number | null
  fiftyTwoWeekHighCents: number | null
  fiftyTwoWeekLowCents: number | null
  volume: bigint | null
  detailsSyncedAt: Date | null
  lastQuoteAt: Date | null
  updatedAt: Date
  stock: CompanyStockFundamentals | null
  fii: CompanyFiiFundamentals | null
  etf: CompanyEtfFundamentals | null
}

/// Exported so batched multi-company queries (comparator) request the exact
/// same shape toDetailDTO expects, rather than duplicating this literal.
export const COMPANY_DETAIL_INCLUDE = { stock: true, fii: true, etf: true } as const

function toDecimalOrNull(value: { toNumber(): number } | null | undefined): number | null {
  return value == null ? null : value.toNumber()
}

/// Exported so src/features/comparator/queries.ts can map a batched
/// findMany's rows through the exact same Decimal/BigInt serialization,
/// instead of re-implementing it or calling this module N times.
export function toDetailDTO(
  company: CompanyGetPayload<{ include: typeof COMPANY_DETAIL_INCLUDE }>
): CompanyDetailDTO {
  return {
    id: company.id,
    ticker: company.ticker,
    name: company.name,
    logoUrl: company.logoUrl,
    description: company.description,
    sector: company.sector,
    segment: company.segment,
    assetClass: company.assetClass,
    currency: company.currency,
    priceCents: company.priceCents,
    priceChangePct: Number(company.priceChangePct),
    marketCapCents: company.marketCapCents,
    dayHighCents: company.dayHighCents,
    dayLowCents: company.dayLowCents,
    fiftyTwoWeekHighCents: company.fiftyTwoWeekHighCents,
    fiftyTwoWeekLowCents: company.fiftyTwoWeekLowCents,
    volume: company.volume,
    detailsSyncedAt: company.detailsSyncedAt,
    lastQuoteAt: company.lastQuoteAt,
    updatedAt: company.updatedAt,
    stock: company.stock
      ? {
          priceToEarnings: toDecimalOrNull(company.stock.priceToEarnings),
          priceToBook: toDecimalOrNull(company.stock.priceToBook),
          roe: toDecimalOrNull(company.stock.roe),
          roic: toDecimalOrNull(company.stock.roic),
          roa: toDecimalOrNull(company.stock.roa),
          dividendYield: toDecimalOrNull(company.stock.dividendYield),
          netMargin: toDecimalOrNull(company.stock.netMargin),
          grossMargin: toDecimalOrNull(company.stock.grossMargin),
          ebitdaMargin: toDecimalOrNull(company.stock.ebitdaMargin),
          psr: toDecimalOrNull(company.stock.psr),
          evToEbit: toDecimalOrNull(company.stock.evToEbit),
          evToEbitda: toDecimalOrNull(company.stock.evToEbitda),
          payout: toDecimalOrNull(company.stock.payout),
          currentLiquidity: toDecimalOrNull(company.stock.currentLiquidity),
          netDebtToEbitda: toDecimalOrNull(company.stock.netDebtToEbitda),
          revenueCagr3y: toDecimalOrNull(company.stock.revenueCagr3y),
          netIncomeCagr3y: toDecimalOrNull(company.stock.netIncomeCagr3y),
          freeFloatPct: toDecimalOrNull(company.stock.freeFloatPct),
          beta: toDecimalOrNull(company.stock.beta),
          netDebtCents: company.stock.netDebtCents,
          equityCents: company.stock.equityCents,
          revenueCents: company.stock.revenueCents,
          netIncomeCents: company.stock.netIncomeCents,
          ebitdaCents: company.stock.ebitdaCents,
          grossDebtCents: company.stock.grossDebtCents,
          bookValuePerShareCents: company.stock.bookValuePerShareCents,
          sharesOutstanding: company.stock.sharesOutstanding,
        }
      : null,
    fii: company.fii
      ? {
          priceToBook: toDecimalOrNull(company.fii.priceToBook),
          dividendYield: toDecimalOrNull(company.fii.dividendYield),
          netWorthCents: company.fii.netWorthCents,
          managementFee: toDecimalOrNull(company.fii.managementFee),
          vacancyRate: toDecimalOrNull(company.fii.vacancyRate),
          propertyCount: company.fii.propertyCount,
          quotaCount: company.fii.quotaCount,
          administrator: company.fii.administrator,
        }
      : null,
    etf: company.etf
      ? {
          benchmarkIndex: company.etf.benchmarkIndex,
          expenseRatio: toDecimalOrNull(company.etf.expenseRatio),
          navCents: company.etf.navCents,
          dividendYield: toDecimalOrNull(company.etf.dividendYield),
        }
      : null,
  }
}

/// The single entry point for /empresa/[ticker] — everything else the page
/// needs (position, similar companies, dividend history, price series) is
/// fetched separately in parallel by the page itself, keyed off this row's
/// id/sector/segment/assetClass. Never calls the market-data provider —
/// Postgres only, same rule as every other query in this app.
export async function getCompanyByTicker(ticker: string): Promise<CompanyDetailDTO | null> {
  const company = await prisma.company.findUnique({
    where: { ticker: ticker.toUpperCase() },
    include: COMPANY_DETAIL_INCLUDE,
  })
  return company ? toDetailDTO(company) : null
}

export type ChartPeriod = "1D" | "5D" | "1M" | "6M" | "1A" | "5A" | "MAX"

export interface PricePointDTO {
  date: Date
  closeCents: number
  volume: bigint | null
}

const PERIOD_DAYS: Record<Exclude<ChartPeriod, "1D" | "MAX">, number> = {
  "5D": 5,
  "1M": 30,
  "6M": 182,
  "1A": 365,
  "5A": 365 * 5,
}

/// "1D" is NOT a real intraday series — PriceHistoryPoint is daily-close
/// only (BrapiProvider hardcodes interval=1d, and BRAPI's free/current-plan
/// tier doesn't expose intraday bars at all). Rather than fabricate a smooth
/// intraday curve, "1D" returns just the two most recent daily closes (today
/// vs. previous close) — the chart component renders this as an honest
/// two-point comparison instead of pretending to have minute-level data.
export async function getPriceHistoryForRange(
  companyId: string,
  period: ChartPeriod
): Promise<PricePointDTO[]> {
  if (period === "1D") {
    return prisma.priceHistoryPoint.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
      take: 2,
      select: { date: true, closeCents: true, volume: true },
    })
  }

  if (period === "MAX") {
    return prisma.priceHistoryPoint.findMany({
      where: { companyId },
      orderBy: { date: "asc" },
      select: { date: true, closeCents: true, volume: true },
    })
  }

  const since = new Date(Date.now() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000)
  return prisma.priceHistoryPoint.findMany({
    where: { companyId, date: { gte: since } },
    orderBy: { date: "asc" },
    select: { date: true, closeCents: true, volume: true },
  })
}

export interface DividendPaymentDTO {
  id: string
  type: "DIVIDEND" | "JCP" | "RENDIMENTO"
  amountPerShare: number
  exDate: Date
  paymentDate: Date | null
}

/// Same trailing-12-month computation used everywhere else in the app
/// (src/features/market/dividend-yield.ts) — real DividendPayment rows over
/// the current price, never a fundamentals-endpoint field (whose fiscal-
/// year convention may not match ours). Used to override the "Dividend
/// Yield" indicator card with a figure consistent with the rest of the app,
/// since Stock.dividendYield itself is never populated by any sync.
export function computeTrailingDividendYield(
  payments: Pick<DividendPaymentDTO, "amountPerShare" | "exDate">[],
  priceCents: number
): number | null {
  if (priceCents <= 0) return null
  const since = Date.now() - 365 * 24 * 60 * 60 * 1000
  const total = payments
    .filter((p) => p.exDate.getTime() >= since)
    .reduce((sum, p) => sum + p.amountPerShare, 0)
  return total > 0 ? (total / (priceCents / 100)) * 100 : null
}

export async function getDividendHistory(
  companyId: string,
  opts?: { limit?: number }
): Promise<DividendPaymentDTO[]> {
  const rows = await prisma.dividendPayment.findMany({
    where: { companyId },
    orderBy: { exDate: "desc" },
    take: opts?.limit,
  })
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    amountPerShare: row.amountPerShare.toNumber(),
    exDate: row.exDate,
    paymentDate: row.paymentDate,
  }))
}

export interface CotacaoStatsDTO {
  dayHighCents: number | null
  dayLowCents: number | null
  fiftyTwoWeekHighCents: number | null
  fiftyTwoWeekLowCents: number | null
  /// "Since we started tracking" — not a real all-time figure, we simply
  /// don't have price history further back than our own sync start. Label
  /// it honestly in the UI (see CotacaoStatsCard), never as "histórica".
  trackedHighCents: number | null
  trackedLowCents: number | null
  trackedSinceDate: Date | null
  volume: bigint | null
}

export async function getCotacaoStats(
  company: Pick<
    CompanyDetailDTO,
    "dayHighCents" | "dayLowCents" | "fiftyTwoWeekHighCents" | "fiftyTwoWeekLowCents" | "volume"
  > & { id: string }
): Promise<CotacaoStatsDTO> {
  const [aggregate, earliest] = await Promise.all([
    prisma.priceHistoryPoint.aggregate({
      where: { companyId: company.id },
      _max: { closeCents: true },
      _min: { closeCents: true },
    }),
    prisma.priceHistoryPoint.findFirst({
      where: { companyId: company.id },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ])

  return {
    dayHighCents: company.dayHighCents,
    dayLowCents: company.dayLowCents,
    fiftyTwoWeekHighCents: company.fiftyTwoWeekHighCents,
    fiftyTwoWeekLowCents: company.fiftyTwoWeekLowCents,
    trackedHighCents: aggregate._max.closeCents,
    trackedLowCents: aggregate._min.closeCents,
    trackedSinceDate: earliest?.date ?? null,
    volume: company.volume,
  }
}

export interface PositionSummaryDTO {
  companyId: string
  quantity: string
  averagePriceCents: number
  currentPriceCents: number
  investedCents: number
  currentValueCents: number
  profitCents: number
  profitPct: number
  dividendsReceivedCents: number
  dividendYieldPct: number
}

/// Single-position equivalent of getPortfolioSummary — same math (via
/// computePositionMetrics), just for one (profileId, companyId) pair
/// instead of the whole portfolio. Returns null when the user doesn't
/// currently hold this asset (no position row, or quantity <= 0).
export async function getUserPositionSummary(
  profileId: string,
  companyId: string
): Promise<PositionSummaryDTO | null> {
  const position = await prisma.portfolioPosition.findUnique({
    where: { profileId_companyId: { profileId, companyId } },
    include: { company: true },
  })
  if (!position || position.quantity.lte(0)) return null

  const metrics = computePositionMetrics({
    quantity: position.quantity,
    priceCents: position.company.priceCents,
    totalInvestedCents: position.totalInvestedCents,
  })

  const dividendYields = await getTrailingDividendYieldMap([
    { id: companyId, priceCents: position.company.priceCents },
  ])

  return {
    companyId,
    quantity: position.quantity.toString(),
    averagePriceCents: position.averagePriceCents,
    currentPriceCents: position.company.priceCents,
    ...metrics,
    dividendsReceivedCents: Number(position.totalDividendsCents),
    dividendYieldPct: dividendYields.get(companyId) ?? 0,
  }
}

/// Same sector+segment first, then same sector, then same assetClass —
/// widens the net only as far as needed to fill `limit`, and never mixes
/// in the company itself. Reuses the existing CompanyListItem shape so the
/// page can render results with the existing CompanyCard component as-is.
export async function getSimilarCompanies(
  company: Pick<CompanyDetailDTO, "id" | "sector" | "segment" | "assetClass">,
  limit = 6
): Promise<CompanyListItem[]> {
  const attempts: Array<Record<string, unknown>> = []
  if (company.sector && company.segment) {
    attempts.push({ sector: company.sector, segment: company.segment })
  }
  if (company.sector) {
    attempts.push({ sector: company.sector })
  }
  attempts.push({ assetClass: company.assetClass })

  const seen = new Map<string, CompanyListItem>()
  for (const where of attempts) {
    if (seen.size >= limit) break
    const rows = await prisma.company.findMany({
      where: { ...where, id: { not: company.id }, priceCents: { gt: 0 } },
      orderBy: { marketCapCents: "desc" },
      take: limit,
    })
    for (const row of rows) {
      if (seen.size >= limit) break
      if (!seen.has(row.ticker)) {
        seen.set(row.ticker, {
          ticker: row.ticker,
          name: row.name,
          logoUrl: row.logoUrl,
          priceCents: row.priceCents,
          changePct: Number(row.priceChangePct),
          dividendYield: 0,
        })
      }
    }
  }
  return [...seen.values()]
}

/// Backs the AI "Está alto?"/"Comparar com o setor" quick questions with a
/// real computed average — never let the model guess a sector figure.
/// Returns null below minSampleSize; callers must tell the model the
/// comparison is unavailable rather than omit it silently.
export async function getSectorIndicatorAverage(
  sector: string,
  assetClass: AssetClass,
  field: "priceToEarnings" | "priceToBook" | "roe" | "roic" | "roa" | "dividendYield" | "netMargin",
  excludeCompanyId: string,
  minSampleSize = 3
): Promise<{ average: number; sampleSize: number } | null> {
  const rows = await prisma.stock.findMany({
    where: {
      company: { sector, assetClass, id: { not: excludeCompanyId } },
      [field]: { not: null },
    },
    select: { [field]: true },
  })
  if (rows.length < minSampleSize) return null

  const values = rows
    .map((row) => (row as Record<string, { toNumber(): number } | null>)[field]?.toNumber())
    .filter((value): value is number => value != null)
  if (values.length < minSampleSize) return null

  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  return { average, sampleSize: values.length }
}

/// General-purpose favorites listing — backs the comparator's "Favoritos"
/// quick-select and (eventually) the still-empty /favoritos page. DY comes
/// from the same batched trailing-yield helper every other list uses, never
/// hardcoded to 0.
export async function getFavoriteCompanies(profileId: string): Promise<CompanyListItem[]> {
  const favorites = await prisma.favorite.findMany({
    where: { profileId },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  })
  if (favorites.length === 0) return []

  const dividendYields = await getTrailingDividendYieldMap(
    favorites.map((favorite) => ({ id: favorite.companyId, priceCents: favorite.company.priceCents }))
  )

  return favorites.map((favorite) => ({
    ticker: favorite.company.ticker,
    name: favorite.company.name,
    logoUrl: favorite.company.logoUrl,
    priceCents: favorite.company.priceCents,
    changePct: Number(favorite.company.priceChangePct),
    dividendYield: dividendYields.get(favorite.companyId) ?? 0,
  }))
}

export async function isCompanyFavorited(profileId: string, companyId: string): Promise<boolean> {
  const favorite = await prisma.favorite.findUnique({
    where: { profileId_companyId: { profileId, companyId } },
    select: { id: true },
  })
  return favorite != null
}

/// Re-exported so callers only need one import for both category metadata
/// and the fundamentals-capability flag it carries.
export { getAssetCategoryMeta }
