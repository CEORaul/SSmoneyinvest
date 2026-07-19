import "server-only"

import { fetchWithRetry } from "@/lib/market-data/http"
import type { MarketDataProvider } from "@/lib/market-data/provider"
import { RateLimiter } from "@/lib/market-data/rate-limiter"
import type {
  CompanyDetails,
  CompanyDirectoryEntry,
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
// AssetClass. Everything else (BDRs, units, FI-Agro/FI-Infra/FIP funds) is
// out of scope per the brief (Ações B3, FIIs, ETFs only) and skipped.
const ASSET_CLASS_BY_TYPE: Record<string, AssetClass | undefined> = {
  "stock|stock": "STOCK",
  "fund|fii": "FII",
  "fund|etf": "ETF",
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
}

interface BrapiQuoteResult {
  symbol: string
  longName: string | null
  regularMarketPrice: number | null
  regularMarketChangePercent: number | null
  priceEarnings: number | null
  historicalDataPrice?: BrapiHistoricalPoint[]
  dividendsData?: { cashDividends: BrapiCashDividend[] } | null
}

interface BrapiQuoteResponse {
  results: BrapiQuoteResult[]
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
        marketCapCents:
          item.market_cap != null ? BigInt(Math.round(item.market_cap * 100)) : null,
      })
    }
    return entries
  }

  async getCompanyDetails(
    ticker: string,
    range: PriceRange
  ): Promise<CompanyDetails | null> {
    const params = new URLSearchParams({
      range,
      interval: "1d",
      fundamental: "true",
      dividends: "true",
    })

    const response = await rateLimiter.schedule(() =>
      fetchWithRetry(`${BASE_URL}/quote/${ticker}?${params.toString()}`, {
        headers: authHeaders(),
      })
    )

    const data = (await response.json()) as BrapiQuoteResponse
    const result = data.results?.[0]
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
      priceHistory,
      dividends,
      source: this.name,
    }
  }
}
