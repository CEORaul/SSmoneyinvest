import "server-only"

import { fetchWithRetry, NonRetryableHttpError } from "@/lib/market-data/http"
import type { MarketDataProvider } from "@/lib/market-data/provider"
import { RateLimiter } from "@/lib/market-data/rate-limiter"
import type {
  CompanyDetails,
  CompanyDirectoryEntry,
  CompanyStockDetails,
  DividendEvent,
  PriceRange,
  PricePoint,
} from "@/lib/market-data/types"
import type { AssetClass, DividendType } from "@/generated/prisma/client"

const BASE_URL = process.env.BRAPI_BASE_URL ?? "https://brapi.dev/api"

// brapi.dev's own docs cite ~5000 req/day on the cheapest paid plan and the
// unauthenticated directory/sandbox endpoints are far more forgiving — 20
// requests/10s keeps us well under either without needing per-plan config.
const rateLimiter = new RateLimiter({ maxRequests: 20, intervalMs: 10_000 })

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
}

interface BrapiSummaryProfile {
  sector: string | null
  longBusinessSummary: string | null
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
  dividendsData?: { cashDividends: BrapiCashDividend[] } | null
  defaultKeyStatistics?: BrapiDefaultKeyStatistics
  financialData?: BrapiFinancialData
  summaryProfile?: BrapiSummaryProfile
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
/// CompanyStockDetails rather than being discarded entirely.
function mapStockDetails(result: BrapiQuoteResult): CompanyStockDetails | null {
  const stats = result.defaultKeyStatistics
  const financials = result.financialData
  const profile = result.summaryProfile
  if (!stats && !financials && !profile) return null

  const toPct = (ratio: number | null | undefined): number | null =>
    ratio != null ? ratio * 100 : null

  return {
    priceToBook: stats?.priceToBook ?? null,
    // No real priceToSales field in Yahoo's quoteSummary shape — leaving
    // psr null (never deriving it from enterpriseToRevenue, which is a
    // different ratio: EV/Revenue includes debt, P/S doesn't) matches
    // "não calcular valores sem fonte confiável" rather than a plausible-
    // looking but subtly wrong number.
    psr: null,
    // No enterpriseToEbit field in Yahoo's shape either — same reasoning.
    evToEbit: null,
    evToEbitda: stats?.enterpriseToEbitda ?? null,
    roe: toPct(financials?.returnOnEquity),
    roic: null,
    roa: toPct(financials?.returnOnAssets),
    grossMargin: toPct(financials?.grossMargins),
    ebitdaMargin: toPct(financials?.ebitdaMargins),
    netMargin: toPct(financials?.profitMargins),
    dividendYield: null, // derived from real DividendPayment history elsewhere, not this field
    payout: null,
    currentLiquidity: financials?.currentRatio ?? null,
    netDebtToEbitda:
      financials?.totalDebt != null && financials?.totalCash != null && financials?.ebitda
        ? (financials.totalDebt - financials.totalCash) / financials.ebitda
        : null,
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
    // already provides, not an independent field Yahoo exposes directly.
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
    description: profile?.longBusinessSummary ?? null,
    sector: profile?.sector ?? null,
  }
}

export class BrapiProvider implements MarketDataProvider {
  readonly name = "brapi.dev"
  readonly capabilities = { directory: true, details: true }

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
  /// restriction is hit: 401/403 (missing token, dividends or modules not
  /// entitled) throws from fetchWithRetry; a disallowed `range` comes back
  /// as a 400 with an in-band `{error:true}` body instead, since
  /// fetchWithRetry only treats 401/403/429/5xx specially. Returns `null`
  /// to signal "this attempt didn't work, try the fallback" either way.
  private async fetchQuote(
    ticker: string,
    params: URLSearchParams
  ): Promise<BrapiQuoteResult | null> {
    let response: Response
    try {
      response = await rateLimiter.schedule(() =>
        fetchWithRetry(`${BASE_URL}/quote/${ticker}?${params.toString()}`, {
          headers: authHeaders(),
        })
      )
    } catch (error) {
      if (error instanceof NonRetryableHttpError) return null
      throw error
    }

    const data = (await response.json()) as BrapiQuoteResponse | BrapiErrorResponse
    if ("error" in data) return null
    return data.results?.[0] ?? null
  }

  /// Two-tier request: the first attempt asks for dividends + the premium
  /// fundamentals modules at the caller's requested range; if the account's
  /// plan doesn't allow one or more of those (confirmed live: our current
  /// token's tier has no dividends access, `modules` beyond `summaryProfile`
  /// 403s for every ticker except BRAPI's 4 free sandbox symbols, and even
  /// `range` itself is capped to 1d/5d/1mo/3mo on this tier), we retry with
  /// a bare request — no dividends, no modules, range capped to a value
  /// every plan tier accepts — that still returns the fields every plan
  /// gets: price, day/52-week range, volume, and OHLCV history. A ticker
  /// never fails outright just because the account isn't entitled to the
  /// extras — it just gets fewer fields, exactly like every other
  /// "sourced but currently null" indicator in this app.
  async getCompanyDetails(
    ticker: string,
    range: PriceRange
  ): Promise<CompanyDetails | null> {
    const fullParams = new URLSearchParams({
      range,
      interval: "1d",
      fundamental: "true",
      dividends: "true",
      modules: "defaultKeyStatistics,financialData,summaryProfile",
    })
    // "3mo" is the longest range confirmed to work across every plan tier
    // we've tested against — used only as the fallback ceiling, never as
    // what we ask for first (a fully-entitled plan should still get
    // whatever range the caller actually wanted).
    const fallbackRange = range === "1mo" || range === "3mo" ? range : "3mo"
    const reducedParams = new URLSearchParams({
      range: fallbackRange,
      interval: "1d",
      fundamental: "true",
    })

    const result =
      (await this.fetchQuote(ticker, fullParams)) ?? (await this.fetchQuote(ticker, reducedParams))
    if (!result) return null

    const priceHistory = (result.historicalDataPrice ?? [])
      .map(mapPricePoint)
      .filter((point): point is PricePoint => point !== null)

    const dividends = (result.dividendsData?.cashDividends ?? [])
      .map(mapDividend)
      .filter((dividend): dividend is DividendEvent => dividend !== null)

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
      stock: mapStockDetails(result),
      source: this.name,
    }
  }
}
