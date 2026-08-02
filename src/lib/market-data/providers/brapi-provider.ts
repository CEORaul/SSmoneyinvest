import "server-only"

import { fetchWithRetry, NonRetryableHttpError } from "@/lib/market-data/http"
import type { MarketDataProvider } from "@/lib/market-data/provider"
import { RateLimiter } from "@/lib/market-data/rate-limiter"
import type {
  CompanyDetails,
  CompanyDirectoryEntry,
  CompanyEtfDetailsInput,
  CompanyFiiDetailsInput,
  CompanyStatementsInput,
  CompanyStockDetails,
  DividendEvent,
  PriceRange,
  PricePoint,
  StatementPeriodInput,
  StockSplitInput,
} from "@/lib/market-data/types"
import type { AssetClass, DividendType } from "@/generated/prisma/client"

const BASE_URL = process.env.BRAPI_BASE_URL ?? "https://brapi.dev/api"

// Self-imposed conservative ceiling, not a value read from BRAPI's own
// plan/rate-limit response headers — kept well under BRAPI Pro's documented
// 500k requests/month even before batching (see getCompanyDetailsBatch)
// made per-sync request counts far lower than this could ever throttle.
// Worth revisiting against BRAPI's actual observed rate-limit headers once
// batching has been running for a while (see final report).
const rateLimiter = new RateLimiter({ maxRequests: 20, intervalMs: 10_000 })

// Up to 20 comma-separated tickers per request on BRAPI Pro (confirmed live
// and via BRAPI's own pricing page) — callers of getCompanyDetailsBatch are
// responsible for chunking to this size; this provider doesn't silently
// split an oversized request itself, so a caller bug fails loudly instead
// of quietly truncating results.
const BATCH_TICKER_LIMIT = 20

// `type`/`subType` combinations from /quote/list that map onto our
// AssetClass. FI-Agro (Fundos de Investimento nas Cadeias Produtivas
// Agroindustriais), FI-Infra (Fundos de Investimento em Infraestrutura),
// FIPs (Fundos de Investimento em Participações), and the handful of quota
// funds brapi returns with no subType at all trade on B3 exactly like FIIs
// do (ticker ending "11", cotas, monthly rendimentos) and are grouped under
// FII here — no distinct AssetClass bucket exists for them yet (a future
// "Fundos de Investimento" category, per asset-category.ts, could split
// these out without touching this map's shape).
const ASSET_CLASS_BY_TYPE: Record<string, AssetClass | undefined> = {
  "stock|stock": "STOCK",
  "fund|fii": "FII",
  "fund|fi-agro": "FII",
  "fund|fi-infra": "FII",
  "fund|fip": "FII",
  "fund|": "FII",
  "fund|etf": "ETF",
  "bdr|bdr": "BDR",
  // Units (e.g. TAEE11, SAPR11) bundle ON+PN shares into one ticket — traded
  // and treated as ordinary equities, not a distinct asset class here.
  "stock|unit": "STOCK",
}

const DIVIDEND_TYPE_BY_LABEL: Record<string, DividendType> = {
  DIVIDENDO: "DIVIDEND",
  JCP: "JCP",
  RENDIMENTO: "RENDIMENTO",
}

// BRAPI's own labels on `dividendsData.stockDividends[]` — confirmed live
// against a real non-sandbox ticker. Anything else (there is no confirmed
// third label) is dropped rather than guessed at in mapStockSplit.
const STOCK_SPLIT_TYPE_BY_LABEL: Record<string, "SPLIT" | "BONUS"> = {
  DESDOBRAMENTO: "SPLIT",
  BONIFICACAO: "BONUS",
}

interface BrapiListStock {
  stock: string
  name: string | null
  close: number | null
  change: number | null
  volume: number | null
  market_cap: number | null
  logo: string | null
  sector: string | null
  subsector: string | null
  type: string
  subType: string | null
}

interface BrapiListResponse {
  stocks: BrapiListStock[]
}

interface BrapiCashDividend {
  paymentDate: string | null
  rate: number
  label: string | null
  lastDatePrior: string | null
  // Confirmed present live alongside the fields above — not previously
  // declared here, so silently dropped by this interface's own narrowing
  // even though BRAPI always returns them.
  relatedTo: string | null
  approvedOn: string | null
  isinCode: string | null
  remarks: string | null
  assetIssued: string | null
}

/// One `dividendsData.stockDividends[]` entry — real split/bonus-share
/// corporate-action history, confirmed live (not previously mapped at all).
interface BrapiStockDividend {
  assetIssued: string | null
  factor: number
  completeFactor: string | null
  approvedOn: string
  isinCode: string | null
  label: string | null
  lastDatePrior: string | null
}

interface BrapiHistoricalPoint {
  date: number
  close: number
  volume: number | null
}

/// Only the `financialData`/`defaultKeyStatistics` fields we actually map
/// to a Stock column — BRAPI/Yahoo return many more, deliberately ignored.
interface BrapiDefaultKeyStatistics {
  beta: number | null
  priceToBook: number | null
  floatShares: number | null
  sharesOutstanding: number | null
  bookValue: number | null
  enterpriseToEbitda: number | null
  netIncomeToCommon: number | null
  // Confirmed present live — needed for PSR (marketCap ÷ totalRevenue) and
  // EV/EBIT (enterpriseValue ÷ ebit, the latter from statement history).
  enterpriseValue: number | null
  marketCap: number | null
  // FII/ETF dividend yield — a decimal ratio (0.11 = 11%), confirmed live
  // against a real FII ticker.
  dividendYield: number | null
}

interface BrapiFinancialData {
  totalRevenue: number | null
  totalDebt: number | null
  totalCash: number | null
  ebitda: number | null
  returnOnEquity: number | null
  returnOnAssets: number | null
  grossMargins: number | null
  ebitdaMargins: number | null
  profitMargins: number | null
  currentRatio: number | null
  debtToEquity: number | null
  revenueGrowthAnnual: number | null
  earningsGrowthAnnual: number | null
  // Confirmed present live in the daily `financialData` module — Fluxo de
  // Caixa (Livre/Operacional) doesn't need to wait for the weekly
  // statements sync after all.
  freeCashflow: number | null
  operatingCashflow: number | null
}

interface BrapiSummaryProfile {
  sector: string | null
  longBusinessSummary: string | null
  // Confirmed present live — Funcionários/Site map straight from these.
  fullTimeEmployees: number | null
  website: string | null
  // FII-only in practice (null for stocks) — backs Fii.administrator.
  administratorName: string | null
}

/// Only the balanceSheetHistory fields this app curates onto real columns
/// (see mapStatements) — BRAPI returns 90+ fields per period, the rest is
/// preserved verbatim in each period's own `raw` blob instead of being
/// individually declared here. `totalStockholderEquity` is frequently null
/// even when a real value exists under `shareholdersEquity` instead
/// (confirmed live) — mapStatements falls back between the two.
interface BrapiBalanceSheetPeriod {
  endDate: string
  totalAssets: number | null
  totalLiab: number | null
  totalStockholderEquity: number | null
  shareholdersEquity: number | null
  totalCurrentAssets: number | null
  totalCurrentLiabilities: number | null
  currentLiabilities: number | null
  longTermDebt: number | null
  cash: number | null
  goodWill: number | null
  intangibleAssets: number | null
  retainedEarnings: number | null
  [key: string]: unknown
}

interface BrapiIncomeStatementPeriod {
  endDate: string
  totalRevenue: number | null
  costOfRevenue: number | null
  grossProfit: number | null
  operatingIncome: number | null
  ebit: number | null
  incomeBeforeTax: number | null
  incomeTaxExpense: number | null
  netIncome: number | null
  basicEarningsPerShare: number | null
  basicEarningsPerCommonShare: number | null
  dilutedEarningsPerShare: number | null
  dilutedEarningsPerCommonShare: number | null
  [key: string]: unknown
}

interface BrapiCashFlowPeriod {
  endDate: string
  operatingCashFlow: number | null
  investmentCashFlow: number | null
  financingCashFlow: number | null
  freeCashFlow: number | null
  initialCashBalance: number | null
  finalCashBalance: number | null
  [key: string]: unknown
}

interface BrapiValueAddedPeriod {
  endDate: string
  revenue: number | null
  grossAddedValue: number | null
  netAddedValue: number | null
  addedValueToDistribute: number | null
  teamRemuneration: number | null
  taxes: number | null
  remunerationOfThirdPartyCapitals: number | null
  equityRemuneration: number | null
  dividends: number | null
  retainedEarningsOrLoss: number | null
  [key: string]: unknown
}

interface BrapiQuoteResult {
  symbol: string
  longName: string | null
  regularMarketPrice: number | null
  regularMarketChangePercent: number | null
  regularMarketDayHigh: number | null
  regularMarketDayLow: number | null
  regularMarketVolume: number | null
  fiftyTwoWeekHigh: number | null
  fiftyTwoWeekLow: number | null
  priceEarnings: number | null
  historicalDataPrice?: BrapiHistoricalPoint[]
  dividendsData?: {
    cashDividends: BrapiCashDividend[]
    stockDividends: BrapiStockDividend[]
  } | null
  defaultKeyStatistics?: BrapiDefaultKeyStatistics
  financialData?: BrapiFinancialData
  summaryProfile?: BrapiSummaryProfile
  balanceSheetHistory?: BrapiBalanceSheetPeriod[]
  balanceSheetHistoryQuarterly?: BrapiBalanceSheetPeriod[]
  incomeStatementHistory?: BrapiIncomeStatementPeriod[]
  incomeStatementHistoryQuarterly?: BrapiIncomeStatementPeriod[]
  cashflowHistory?: BrapiCashFlowPeriod[]
  cashflowHistoryQuarterly?: BrapiCashFlowPeriod[]
  valueAddedHistory?: BrapiValueAddedPeriod[]
  valueAddedHistoryQuarterly?: BrapiValueAddedPeriod[]
}

interface BrapiQuoteResponse {
  results: BrapiQuoteResult[]
}

interface BrapiErrorResponse {
  error: true
  code: string
  message: string
}

function authHeaders(): HeadersInit {
  const token = process.env.BRAPI_API_TOKEN
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/// brapi.dev's `/quote/list` "data-com" proxy: cashDividends has no explicit
/// ex-date field, only `lastDatePrior` (the last day you could still buy and
/// receive the payment) and `paymentDate`. `lastDatePrior` is the closest
/// available proxy for ex-date; fall back to paymentDate if it's missing.
function resolveExDate(dividend: BrapiCashDividend): Date | null {
  const raw = dividend.lastDatePrior ?? dividend.paymentDate
  return raw ? new Date(raw) : null
}

function mapDividend(dividend: BrapiCashDividend): DividendEvent | null {
  const exDate = resolveExDate(dividend)
  if (!exDate || !Number.isFinite(dividend.rate)) return null

  return {
    type: DIVIDEND_TYPE_BY_LABEL[dividend.label ?? ""] ?? "DIVIDEND",
    amountPerShare: dividend.rate,
    exDate,
    paymentDate: dividend.paymentDate ? new Date(dividend.paymentDate) : null,
    relatedTo: dividend.relatedTo || null,
    isinCode: dividend.isinCode,
    remarks: dividend.remarks || null,
    approvedOn: dividend.approvedOn ? new Date(dividend.approvedOn) : null,
  }
}

/// `dividendsData.stockDividends[]` → real split/bonus history. Unlike
/// dividends, there's no ex-date proxy needed — `approvedOn` is the
/// corporate action's own real date.
function mapStockSplit(split: BrapiStockDividend): StockSplitInput | null {
  const type = STOCK_SPLIT_TYPE_BY_LABEL[split.label ?? ""]
  if (!type || !split.approvedOn || !Number.isFinite(split.factor)) return null

  return {
    type,
    factor: split.factor,
    completeFactor: split.completeFactor,
    isinCode: split.isinCode,
    approvedOn: new Date(split.approvedOn),
    lastDatePrior: split.lastDatePrior ? new Date(split.lastDatePrior) : null,
  }
}

function mapPricePoint(point: BrapiHistoricalPoint): PricePoint | null {
  if (!Number.isFinite(point.close)) return null
  return {
    date: new Date(point.date * 1000),
    closeCents: Math.round(point.close * 100),
    volume: point.volume != null ? BigInt(Math.round(point.volume)) : null,
  }
}

/// Maps whatever premium-module data actually came back — every field is
/// independently optional, so a partial response (e.g. defaultKeyStatistics
/// present but financialData absent) still produces a partially-populated
/// CompanyStockDetails rather than being discarded entirely. Confirmed live
/// against a real non-sandbox ticker (WEGE3): a Pro-tier token gets full
/// access to every field here, not just BRAPI's 4 free sandbox symbols —
/// any field still null below is null because BRAPI genuinely didn't return
/// it for that ticker/period, or because it needs statement history this
/// single-quote response doesn't carry (see market-data-service's
/// refreshCompanyStatements, which fills evToEbit/roic/payout/CAGRs).
function mapStockDetails(result: BrapiQuoteResult): CompanyStockDetails | null {
  const stats = result.defaultKeyStatistics
  const financials = result.financialData
  const profile = result.summaryProfile
  if (!stats && !financials && !profile) return null

  const toPct = (ratio: number | null | undefined): number | null =>
    ratio != null ? ratio * 100 : null

  return {
    priceToBook: stats?.priceToBook ?? null,
    // marketCap ÷ totalRevenue — a real derivation from two fields this
    // same response already provides (never enterpriseToRevenue, which is
    // EV/Revenue, a genuinely different ratio that includes debt).
    psr:
      stats?.marketCap != null && financials?.totalRevenue
        ? stats.marketCap / financials.totalRevenue
        : null,
    // Needs `ebit` from statement history (incomeStatementHistory), which
    // this single-quote response doesn't carry — computed in
    // market-data-service.refreshCompanyStatements from enterpriseValue ÷
    // the latest annual ebit, not left as a permanently-missing field.
    evToEbit: null,
    evToEbitda: stats?.enterpriseToEbitda ?? null,
    roe: toPct(financials?.returnOnEquity),
    // NOPAT ÷ Invested Capital needs statement-history components (ebit,
    // tax rate, equity+debt) this response doesn't carry — computed in
    // refreshCompanyStatements, same as evToEbit above.
    roic: null,
    roa: toPct(financials?.returnOnAssets),
    grossMargin: toPct(financials?.grossMargins),
    ebitdaMargin: toPct(financials?.ebitdaMargins),
    netMargin: toPct(financials?.profitMargins),
    dividendYield: null, // derived from real DividendPayment history elsewhere, not this field
    // Needs trailing dividend history relative to net income — computed in
    // refreshCompanyStatements once that history is in Postgres, not here.
    payout: null,
    currentLiquidity: financials?.currentRatio ?? null,
    netDebtToEbitda:
      financials?.totalDebt != null && financials?.totalCash != null && financials?.ebitda
        ? (financials.totalDebt - financials.totalCash) / financials.ebitda
        : null,
    // Needs ≥4 annual periods of statement history — computed in
    // refreshCompanyStatements.
    revenueCagr3y: null,
    netIncomeCagr3y: null,
    freeFloatPct:
      stats?.floatShares != null && stats?.sharesOutstanding
        ? (stats.floatShares / stats.sharesOutstanding) * 100
        : null,
    beta: stats?.beta ?? null,
    netDebtCents:
      financials?.totalDebt != null && financials?.totalCash != null
        ? BigInt(Math.round((financials.totalDebt - financials.totalCash) * 100))
        : null,
    // Patrimônio Líquido ≈ valor patrimonial por ação × ações em circulação
    // — a real derivation from two fields the same modules response
    // already provides. refreshCompanyStatements prefers the real
    // totalStockholderEquity/shareholdersEquity balance-sheet figure over
    // this approximation once statement history exists for the company.
    equityCents:
      stats?.bookValue != null && stats?.sharesOutstanding != null
        ? BigInt(Math.round(stats.bookValue * stats.sharesOutstanding * 100))
        : null,
    revenueCents: financials?.totalRevenue != null ? BigInt(Math.round(financials.totalRevenue * 100)) : null,
    netIncomeCents:
      stats?.netIncomeToCommon != null ? BigInt(Math.round(stats.netIncomeToCommon * 100)) : null,
    ebitdaCents: financials?.ebitda != null ? BigInt(Math.round(financials.ebitda * 100)) : null,
    grossDebtCents: financials?.totalDebt != null ? BigInt(Math.round(financials.totalDebt * 100)) : null,
    bookValuePerShareCents: stats?.bookValue != null ? Math.round(stats.bookValue * 100) : null,
    sharesOutstanding: stats?.sharesOutstanding != null ? BigInt(Math.round(stats.sharesOutstanding)) : null,
    // Confirmed real fields on the daily `financialData` module — no need
    // to wait for the weekly statement sync for these two.
    freeCashFlowCents:
      financials?.freeCashflow != null ? BigInt(Math.round(financials.freeCashflow * 100)) : null,
    operatingCashFlowCents:
      financials?.operatingCashflow != null ? BigInt(Math.round(financials.operatingCashflow * 100)) : null,
    description: profile?.longBusinessSummary ?? null,
    sector: profile?.sector ?? null,
    employees: profile?.fullTimeEmployees ?? null,
    website: profile?.website ?? null,
  }
}

/// FII-specific fields BRAPI actually returns (confirmed live against a
/// real FII ticker) — the free FII widget's dividendYield/priceToBook come
/// from the exact same `defaultKeyStatistics` module stocks use. No
/// confirmed field exists for managementFee/vacancyRate/propertyCount/
/// quotaCount at any tier, so those `Fii` columns are simply never mapped
/// here rather than guessed.
function mapFiiDetails(result: BrapiQuoteResult): CompanyFiiDetailsInput | null {
  const stats = result.defaultKeyStatistics
  const profile = result.summaryProfile
  if (!stats && !profile) return null

  return {
    priceToBook: stats?.priceToBook ?? null,
    dividendYield: toDecimalPct(stats?.dividendYield),
    administrator: profile?.administratorName ?? null,
    netWorthCents:
      stats?.bookValue != null && stats?.sharesOutstanding != null
        ? BigInt(Math.round(stats.bookValue * stats.sharesOutstanding * 100))
        : null,
  }
}

/// ETF-specific fields — only dividendYield is a confirmed real field;
/// benchmarkIndex/expenseRatio/navCents have no confirmed BRAPI source.
function mapEtfDetails(result: BrapiQuoteResult): CompanyEtfDetailsInput | null {
  const stats = result.defaultKeyStatistics
  if (!stats) return null
  return { dividendYield: toDecimalPct(stats.dividendYield) }
}

/// BRAPI's `defaultKeyStatistics.dividendYield` is already a decimal ratio
/// (e.g. 0.11 for 11%, confirmed live against a real FII), unlike
/// `financialData`'s percent-scaled ratios (`toPct` above multiplies by
/// 100) — a distinct helper so the two scales are never mixed up.
function toDecimalPct(ratio: number | null | undefined): number | null {
  return ratio != null ? ratio * 100 : null
}

/// Every `curated` value is stored pre-converted to integer cents (matching
/// this codebase's universal monetary convention — see mapStockDetails'
/// identical `BigInt(Math.round(x * 100))` pattern) so market-data-service
/// never has to guess a field's unit; `basicEps`/`dilutedEps` are the sole
/// exception (kept as real currency values, matching Stock.priceToEarnings
/// and friends which are also stored un-multiplied).
function toCents(value: number | null | undefined): number | null {
  return value != null ? Math.round(value * 100) : null
}

function mapBalanceSheetPeriod(period: BrapiBalanceSheetPeriod): StatementPeriodInput | null {
  if (!period.endDate) return null
  return {
    endDate: new Date(period.endDate),
    curated: {
      totalAssetsCents: toCents(period.totalAssets),
      totalLiabilitiesCents: toCents(period.totalLiab),
      // Real B3 filings frequently populate one of these two and leave the
      // other null (confirmed live) — prefer totalStockholderEquity (the
      // Yahoo-shape canonical field) but fall back to shareholdersEquity
      // rather than losing the period's equity figure entirely.
      totalEquityCents: toCents(period.totalStockholderEquity ?? period.shareholdersEquity),
      totalCurrentAssetsCents: toCents(period.totalCurrentAssets),
      totalCurrentLiabilitiesCents: toCents(period.totalCurrentLiabilities ?? period.currentLiabilities),
      cashCents: toCents(period.cash),
      longTermDebtCents: toCents(period.longTermDebt),
      goodWillCents: toCents(period.goodWill),
      intangibleAssetsCents: toCents(period.intangibleAssets),
      retainedEarningsCents: toCents(period.retainedEarnings),
    },
    raw: period,
  }
}

function mapIncomeStatementPeriod(period: BrapiIncomeStatementPeriod): StatementPeriodInput | null {
  if (!period.endDate) return null
  return {
    endDate: new Date(period.endDate),
    curated: {
      totalRevenueCents: toCents(period.totalRevenue),
      costOfRevenueCents: toCents(period.costOfRevenue),
      grossProfitCents: toCents(period.grossProfit),
      operatingIncomeCents: toCents(period.operatingIncome),
      ebitCents: toCents(period.ebit),
      incomeBeforeTaxCents: toCents(period.incomeBeforeTax),
      incomeTaxExpenseCents: toCents(period.incomeTaxExpense),
      netIncomeCents: toCents(period.netIncome),
      // Common-share EPS is the more specific figure when present
      // (confirmed live: basicEarningsPerShare is frequently null while
      // basicEarningsPerCommonShare carries the real value). Kept as a
      // real currency value (not cents) to match Decimal(12,6) columns.
      basicEps: period.basicEarningsPerShare ?? period.basicEarningsPerCommonShare ?? null,
      dilutedEps: period.dilutedEarningsPerShare ?? period.dilutedEarningsPerCommonShare ?? null,
    },
    raw: period,
  }
}

function mapCashFlowPeriod(period: BrapiCashFlowPeriod): StatementPeriodInput | null {
  if (!period.endDate) return null
  return {
    endDate: new Date(period.endDate),
    curated: {
      operatingCashFlowCents: toCents(period.operatingCashFlow),
      investmentCashFlowCents: toCents(period.investmentCashFlow),
      financingCashFlowCents: toCents(period.financingCashFlow),
      freeCashFlowCents: toCents(period.freeCashFlow),
      initialCashBalanceCents: toCents(period.initialCashBalance),
      finalCashBalanceCents: toCents(period.finalCashBalance),
    },
    raw: period,
  }
}

function mapValueAddedPeriod(period: BrapiValueAddedPeriod): StatementPeriodInput | null {
  if (!period.endDate) return null
  return {
    endDate: new Date(period.endDate),
    curated: {
      revenueCents: toCents(period.revenue),
      grossAddedValueCents: toCents(period.grossAddedValue),
      netAddedValueCents: toCents(period.netAddedValue),
      addedValueToDistributeCents: toCents(period.addedValueToDistribute),
      teamRemunerationCents: toCents(period.teamRemuneration),
      taxesCents: toCents(period.taxes),
      equityRemunerationCents: toCents(period.equityRemuneration),
      dividendsCents: toCents(period.dividends),
      retainedEarningsOrLossCents: toCents(period.retainedEarningsOrLoss),
    },
    raw: period,
  }
}

function mapPeriods<T>(periods: T[] | undefined, mapper: (p: T) => StatementPeriodInput | null): StatementPeriodInput[] {
  return (periods ?? []).map(mapper).filter((p): p is StatementPeriodInput => p !== null)
}

/// Assembles every statement-history array on a quote result into the
/// domain shape — only ever called from getCompanyStatementsBatch, since
/// that's the only request that asks for these modules at all.
function mapStatements(result: BrapiQuoteResult): CompanyStatementsInput {
  return {
    balanceSheet: mapPeriods(result.balanceSheetHistory, mapBalanceSheetPeriod),
    balanceSheetQuarterly: mapPeriods(result.balanceSheetHistoryQuarterly, mapBalanceSheetPeriod),
    incomeStatement: mapPeriods(result.incomeStatementHistory, mapIncomeStatementPeriod),
    incomeStatementQuarterly: mapPeriods(result.incomeStatementHistoryQuarterly, mapIncomeStatementPeriod),
    cashFlow: mapPeriods(result.cashflowHistory, mapCashFlowPeriod),
    cashFlowQuarterly: mapPeriods(result.cashflowHistoryQuarterly, mapCashFlowPeriod),
    valueAdded: mapPeriods(result.valueAddedHistory, mapValueAddedPeriod),
    valueAddedQuarterly: mapPeriods(result.valueAddedHistoryQuarterly, mapValueAddedPeriod),
  }
}

// Daily module set — deliberately excludes the heavy statement-history
// modules (see market-data-service.refreshCompanyStatements for those) so
// the frequent daily sync's payload/write volume stays light; fundamentals
// that DO belong here change slowly enough (P/L, margins, ratios) that a
// once-a-day refresh is already generous, but they're cheap to carry
// alongside the base quote every tick.
const FULL_MODULES = "defaultKeyStatistics,financialData,summaryProfile"

export class BrapiProvider implements MarketDataProvider {
  readonly name = "brapi.dev"
  readonly capabilities = { directory: true, details: true, batch: true, statements: true }

  async listCompanyDirectory(): Promise<CompanyDirectoryEntry[]> {
    const response = await rateLimiter.schedule(() =>
      fetchWithRetry(`${BASE_URL}/quote/list`)
    )
    const data = (await response.json()) as BrapiListResponse

    const entries: CompanyDirectoryEntry[] = []
    for (const item of data.stocks) {
      const assetClass = ASSET_CLASS_BY_TYPE[`${item.type}|${item.subType ?? ""}`]
      if (!assetClass || !item.name || item.close == null) continue

      entries.push({
        ticker: item.stock,
        name: item.name,
        assetClass,
        sector: item.sector,
        segment: item.subsector,
        logoUrl: item.logo,
        priceCents: Math.round(item.close * 100),
        priceChangePct: item.change ?? 0,
        volume: item.volume != null ? BigInt(Math.round(item.volume)) : null,
        marketCapCents:
          item.market_cap != null ? BigInt(Math.round(item.market_cap * 100)) : null,
        source: this.name,
      })
    }
    return entries
  }

  /// A plan/ticker combination that can't fulfill everything the "full"
  /// request asked for surfaces two different ways depending on which
  /// restriction is hit: 401/403 (missing/invalid token) throws from
  /// fetchWithRetry; a disallowed `range` for a specific asset type comes
  /// back as a 400 with an in-band `{error:true}` body instead, since
  /// fetchWithRetry only treats 401/403/429/5xx specially. Returns `null`
  /// to signal "this attempt didn't work, try the fallback" either way.
  /// `tickerOrTickers` accepts either one symbol or a comma-joined batch —
  /// BRAPI's endpoint shape is identical either way, just with `results`
  /// carrying one or many entries (see getCompanyDetailsBatch).
  private async fetchQuote(
    tickerOrTickers: string,
    params: URLSearchParams
  ): Promise<BrapiQuoteResponse | null> {
    let response: Response
    try {
      response = await rateLimiter.schedule(() =>
        fetchWithRetry(`${BASE_URL}/quote/${tickerOrTickers}?${params.toString()}`, {
          headers: authHeaders(),
        })
      )
    } catch (error) {
      if (error instanceof NonRetryableHttpError) return null
      throw error
    }

    const data = (await response.json()) as BrapiQuoteResponse | BrapiErrorResponse
    if ("error" in data) return null
    return data
  }

  /// The one place a raw BRAPI quote result becomes this app's domain
  /// shape — used by both the single-ticker and batch paths so there is
  /// exactly one mapping implementation, never two copies that could drift.
  private mapQuoteResultToDetails(result: BrapiQuoteResult): CompanyDetails {
    const priceHistory = (result.historicalDataPrice ?? [])
      .map(mapPricePoint)
      .filter((point): point is PricePoint => point !== null)

    const dividends = (result.dividendsData?.cashDividends ?? [])
      .map(mapDividend)
      .filter((dividend): dividend is DividendEvent => dividend !== null)

    const splits = (result.dividendsData?.stockDividends ?? [])
      .map(mapStockSplit)
      .filter((split): split is StockSplitInput => split !== null)

    return {
      ticker: result.symbol,
      name: result.longName,
      priceCents:
        result.regularMarketPrice != null
          ? Math.round(result.regularMarketPrice * 100)
          : null,
      priceChangePct: result.regularMarketChangePercent,
      priceToEarnings: result.priceEarnings,
      dayHighCents: result.regularMarketDayHigh != null ? Math.round(result.regularMarketDayHigh * 100) : null,
      dayLowCents: result.regularMarketDayLow != null ? Math.round(result.regularMarketDayLow * 100) : null,
      fiftyTwoWeekHighCents: result.fiftyTwoWeekHigh != null ? Math.round(result.fiftyTwoWeekHigh * 100) : null,
      fiftyTwoWeekLowCents: result.fiftyTwoWeekLow != null ? Math.round(result.fiftyTwoWeekLow * 100) : null,
      volume: result.regularMarketVolume != null ? BigInt(Math.round(result.regularMarketVolume)) : null,
      priceHistory,
      dividends,
      splits,
      stock: mapStockDetails(result),
      fii: mapFiiDetails(result),
      etf: mapEtfDetails(result),
      // Only the weekly refreshCompanyStatements request asks for the
      // statement-history modules — this daily/on-demand path never does,
      // so `statements` is always null here (see mapStatementsIfRequested,
      // called from the statements-specific fetch path instead).
      statements: null,
      source: this.name,
    }
  }

  /// Two-tier request: the first attempt asks for the daily fundamentals
  /// modules + dividends at the caller's requested range; if that specific
  /// range isn't valid for this asset type (BRAPI rejects some ranges for
  /// some instrument types with a 400) or the request fails for any other
  /// transport reason, we retry with a bare request — no dividends, no
  /// modules, range capped to a value every asset type accepts — that
  /// still returns the fields every ticker gets: price, day/52-week range,
  /// volume, and OHLCV history. A ticker never fails outright just because
  /// the full request didn't go through — it just gets fewer fields,
  /// exactly like every other "sourced but currently null" indicator in
  /// this app.
  async getCompanyDetails(
    ticker: string,
    range: PriceRange
  ): Promise<CompanyDetails | null> {
    const fullParams = new URLSearchParams({
      range,
      interval: "1d",
      fundamental: "true",
      dividends: "true",
      modules: FULL_MODULES,
    })
    // "3mo" is the longest range confirmed to work across every asset type
    // — used only as the fallback ceiling, never as what we ask for first.
    const fallbackRange = range === "1mo" || range === "3mo" ? range : "3mo"
    const reducedParams = new URLSearchParams({
      range: fallbackRange,
      interval: "1d",
      fundamental: "true",
    })

    const response =
      (await this.fetchQuote(ticker, fullParams)) ?? (await this.fetchQuote(ticker, reducedParams))
    const result = response?.results?.[0]
    if (!result) return null

    return this.mapQuoteResultToDetails(result)
  }

  /// Same two-tier full/reduced strategy as getCompanyDetails, but for up
  /// to BATCH_TICKER_LIMIT tickers in one request — confirmed live that
  /// BRAPI returns full premium modules for every ticker in a batch, not
  /// just base quotes. Missing/invalid symbols are simply absent from
  /// `results` (BRAPI drops them silently rather than erroring the whole
  /// call) — this method reflects that by leaving them out of the returned
  /// map rather than throwing; MarketDataService falls back to a
  /// single-ticker call for anything missing.
  async getCompanyDetailsBatch(
    tickers: string[],
    range: PriceRange
  ): Promise<Map<string, CompanyDetails>> {
    const joined = tickers.slice(0, BATCH_TICKER_LIMIT).join(",")
    const fullParams = new URLSearchParams({
      range,
      interval: "1d",
      fundamental: "true",
      dividends: "true",
      modules: FULL_MODULES,
    })
    const fallbackRange = range === "1mo" || range === "3mo" ? range : "3mo"
    const reducedParams = new URLSearchParams({
      range: fallbackRange,
      interval: "1d",
      fundamental: "true",
    })

    const response =
      (await this.fetchQuote(joined, fullParams)) ?? (await this.fetchQuote(joined, reducedParams))

    const map = new Map<string, CompanyDetails>()
    for (const result of response?.results ?? []) {
      map.set(result.symbol, this.mapQuoteResultToDetails(result))
    }
    return map
  }

  /// The weekly "statements" request — asks for the 8 statement-history
  /// modules (annual + quarterly balance sheet/income/cashflow/DVA) plus
  /// dividends, for up to BATCH_TICKER_LIMIT tickers at once. Kept as a
  /// separate method (not folded into getCompanyDetailsBatch) so the
  /// frequent daily/batch path never pays for this much heavier payload —
  /// see market-data-service.refreshCompanyStatements, the only caller.
  async getCompanyStatementsBatch(
    tickers: string[],
    range: PriceRange
  ): Promise<Map<string, CompanyDetails>> {
    const joined = tickers.slice(0, BATCH_TICKER_LIMIT).join(",")
    const modules = [
      FULL_MODULES,
      "balanceSheetHistory",
      "balanceSheetHistoryQuarterly",
      "incomeStatementHistory",
      "incomeStatementHistoryQuarterly",
      "cashflowHistory",
      "cashflowHistoryQuarterly",
      "valueAddedHistory",
      "valueAddedHistoryQuarterly",
    ].join(",")
    const params = new URLSearchParams({ range, interval: "1d", fundamental: "true", dividends: "true", modules })

    const response = await this.fetchQuote(joined, params)

    const map = new Map<string, CompanyDetails>()
    for (const result of response?.results ?? []) {
      const details = this.mapQuoteResultToDetails(result)
      map.set(result.symbol, { ...details, statements: mapStatements(result) })
    }
    return map
  }
}
