"use server"

import type { AssetClass } from "@/generated/prisma/client"
import { computeTrailingDividendYield, getFavoriteCompanies } from "@/features/company/queries"
import type { ChartPeriod } from "@/features/company/queries"
import {
  getCompaniesByTickers,
  getDividendHistoryForCompanies,
  getPriceHistoryForCompanies,
  getTopCompaniesByAssetClass,
} from "@/features/comparator/queries"
import { getTopDividendPayers } from "@/features/market/queries"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { getOptionalProfile } from "@/lib/auth/session"
import { aiContentService } from "@/services/ai-content-service"

/// Every quick-select shortcut resolves to a plain ticker list — selection
/// state lives entirely in the /comparar URL (?tickers=...), so these
/// actions never need to return anything richer than that.

/// "Minha Carteira" — every held asset, across all categories. Empty for a
/// logged-out visitor rather than throwing, since the quick-select menu is
/// visible on the public /comparar page too.
export async function getPortfolioTickersAction(): Promise<string[]> {
  const profile = await getOptionalProfile()
  if (!profile) return []
  const summary = await getPortfolioSummary(profile.id)
  return summary.positions.map((position) => position.ticker)
}

/// "Maiores posições" — top holdings by current value, capped at the
/// comparator's own 10-asset limit (positions already come pre-sorted
/// desc by currentValueCents from getPortfolioSummary).
export async function getTopHoldingsTickersAction(limit = 10): Promise<string[]> {
  const profile = await getOptionalProfile()
  if (!profile) return []
  const summary = await getPortfolioSummary(profile.id)
  return summary.positions.slice(0, limit).map((position) => position.ticker)
}

/// "Favoritos"
export async function getFavoriteTickersAction(): Promise<string[]> {
  const profile = await getOptionalProfile()
  if (!profile) return []
  const favorites = await getFavoriteCompanies(profile.id)
  return favorites.map((company) => company.ticker)
}

/// "Dividendos" — market-wide top payers (reuses the same query the Home
/// page's "Top Dividendos" section already calls), not portfolio-scoped.
export async function getDividendPayersTickersAction(): Promise<string[]> {
  const payers = await getTopDividendPayers(10)
  return payers.map((company) => company.ticker)
}

/// "Todas as Ações"/"Todos os FIIs"/"Todos ETFs"/"Todas Criptos" — market-
/// wide, ranked by market cap.
export async function getMarketTopTickersAction(assetClass: AssetClass): Promise<string[]> {
  const companies = await getTopCompaniesByAssetClass(assetClass)
  return companies.map((company) => company.ticker)
}

/// Backs "Comparar minha carteira"'s sub-filters (Todas posições/Somente
/// ações/FIIs/ETFs/Criptos/Somente favoritos) — one action, every filter
/// combination, since they're all just different slices of the same
/// already-computed portfolio summary.
export async function getPortfolioTickersByFilterAction(filter: {
  assetClass?: AssetClass
  favoritesOnly?: boolean
}): Promise<string[]> {
  const profile = await getOptionalProfile()
  if (!profile) return []

  const summary = await getPortfolioSummary(profile.id)
  let positions = summary.positions
  if (filter.assetClass) {
    positions = positions.filter((position) => position.assetClass === filter.assetClass)
  }

  if (filter.favoritesOnly) {
    const favorites = await getFavoriteCompanies(profile.id)
    const favoriteTickers = new Set(favorites.map((company) => company.ticker))
    positions = positions.filter((position) => favoriteTickers.has(position.ticker))
  }

  return positions.map((position) => position.ticker)
}

export interface ComparisonAiResult {
  ok: boolean
  text?: string
  generatedAt?: string
}

/// Both AI actions re-derive CompanyDetailDTO[] server-side from the
/// tickers (never trust client-supplied numbers) and apply the same
/// trailing-12-month dividend yield override the individual /empresa/
/// [ticker] page's action already does — Stock/Fii/Etf.dividendYield is
/// never populated by any sync, so the real value only exists via this
/// computation.
async function resolveComparisonCompanies(tickers: string[]) {
  const companies = await getCompaniesByTickers(tickers)
  if (companies.length === 0) return []

  const dividendHistory = await getDividendHistoryForCompanies(companies.map((c) => c.id))

  return companies.map((company) => {
    const trailingYield = computeTrailingDividendYield(
      dividendHistory.get(company.id) ?? [],
      company.priceCents
    )
    if (trailingYield == null) return company
    return {
      ...company,
      stock: company.stock ? { ...company.stock, dividendYield: trailingYield } : null,
      fii: company.fii ? { ...company.fii, dividendYield: trailingYield } : null,
      etf: company.etf ? { ...company.etf, dividendYield: trailingYield } : null,
    }
  })
}

/// Backs the "Resumo Executivo" card at the top of /comparar.
export async function requestComparisonSummaryAction(tickers: string[]): Promise<ComparisonAiResult> {
  const companies = await resolveComparisonCompanies(tickers)
  if (companies.length < 2) return { ok: false }

  const result = await aiContentService.getOrGenerateComparisonSummary(companies)
  return result ? { ok: true, text: result.text, generatedAt: result.generatedAt.toISOString() } : { ok: false }
}

/// Backs the "Analisar Comparação" button.
export async function requestComparisonAnalysisAction(tickers: string[]): Promise<ComparisonAiResult> {
  const companies = await resolveComparisonCompanies(tickers)
  if (companies.length < 2) return { ok: false }

  const result = await aiContentService.getOrGenerateComparisonAnalysis(companies)
  return result ? { ok: true, text: result.text, generatedAt: result.generatedAt.toISOString() } : { ok: false }
}

export interface CompanyPricePoints {
  companyId: string
  points: { date: string; closeCents: number }[]
}

/// ComparisonChartSection calls this on every period-tab switch in
/// comparison mode — one batched query for all selected companies, same
/// PriceHistoryPoint-only read every other price-history query in the app
/// uses. Returns a plain array (not a Map) since Server Action return values
/// cross the same server→client boundary as props.
export async function getPriceHistoryForCompaniesAction(
  companyIds: string[],
  period: ChartPeriod
): Promise<CompanyPricePoints[]> {
  const map = await getPriceHistoryForCompanies(companyIds, period)
  return companyIds.map((companyId) => ({
    companyId,
    points: (map.get(companyId) ?? []).map((point) => ({
      date: point.date.toISOString(),
      closeCents: point.closeCents,
    })),
  }))
}
