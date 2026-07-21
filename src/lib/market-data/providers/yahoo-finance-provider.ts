import "server-only"

import { fetchWithRetry } from "@/lib/market-data/http"
import type { MarketDataProvider } from "@/lib/market-data/provider"
import { RateLimiter } from "@/lib/market-data/rate-limiter"
import type {
  CompanyDetails,
  DividendEvent,
  PriceRange,
  PricePoint,
} from "@/lib/market-data/types"

const BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart"

// Unofficial endpoint, no published limit — conservative and polite by
// default rather than tuned against a documented number like brapi's.
const rateLimiter = new RateLimiter({ maxRequests: 10, intervalMs: 10_000 })

interface YahooDividendEvent {
  amount: number
  date: number
}

interface YahooQuote {
  close: (number | null)[]
  volume: (number | null)[]
}

interface YahooChartResult {
  meta: {
    symbol: string
    regularMarketPrice?: number
    regularMarketDayHigh?: number
    regularMarketDayLow?: number
    regularMarketVolume?: number
    fiftyTwoWeekHigh?: number
    fiftyTwoWeekLow?: number
    chartPreviousClose?: number
    longName?: string
    shortName?: string
  }
  timestamp?: number[]
  indicators: { quote: YahooQuote[] }
  events?: { dividends?: Record<string, YahooDividendEvent> }
}

interface YahooChartResponse {
  chart: {
    result: YahooChartResult[] | null
    error: { description: string } | null
  }
}

function mapPriceHistory(result: YahooChartResult): PricePoint[] {
  const timestamps = result.timestamp ?? []
  const closes = result.indicators.quote[0]?.close ?? []
  const volumes = result.indicators.quote[0]?.volume ?? []

  const points: PricePoint[] = []
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i]
    if (close == null) continue
    const volume = volumes[i]
    points.push({
      date: new Date(timestamps[i] * 1000),
      closeCents: Math.round(close * 100),
      volume: volume != null ? BigInt(Math.round(volume)) : null,
    })
  }
  return points
}

function mapDividends(result: YahooChartResult): DividendEvent[] {
  const events = result.events?.dividends
  if (!events) return []

  // Yahoo doesn't distinguish dividendo/JCP/rendimento the way B3 does —
  // brapi (priority 1) remains the source for that granularity; this only
  // fills the gap when brapi couldn't be reached at all for a ticker.
  return Object.values(events).map((event) => ({
    type: "DIVIDEND" as const,
    amountPerShare: event.amount,
    exDate: new Date(event.date * 1000),
    paymentDate: null,
  }))
}

/// Fallback provider — covers B3 tickers via the `.SA` suffix on Yahoo's
/// unofficial (unlicensed, no SLA) chart endpoint. Has no bulk market
/// listing, so `capabilities.directory` is false and ProviderManager never
/// routes directory syncs here. Exists to take over per-ticker detail sync
/// when brapi can't serve a ticker (most commonly: no BRAPI_API_TOKEN).
export class YahooFinanceProvider implements MarketDataProvider {
  readonly name = "yahoo-finance"
  readonly capabilities = { directory: false, details: true }

  async listCompanyDirectory() {
    return []
  }

  async getCompanyDetails(
    ticker: string,
    range: PriceRange
  ): Promise<CompanyDetails | null> {
    const params = new URLSearchParams({
      range,
      interval: "1d",
      events: "div,splits",
    })

    const response = await rateLimiter.schedule(() =>
      fetchWithRetry(`${BASE_URL}/${ticker}.SA?${params.toString()}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SSmoneyInvestBot/1.0)" },
      })
    )

    const data = (await response.json()) as YahooChartResponse
    const result = data.chart.result?.[0]
    if (!result) return null

    const priceCents =
      result.meta.regularMarketPrice != null
        ? Math.round(result.meta.regularMarketPrice * 100)
        : null
    const priceChangePct =
      result.meta.regularMarketPrice != null && result.meta.chartPreviousClose
        ? ((result.meta.regularMarketPrice - result.meta.chartPreviousClose) /
            result.meta.chartPreviousClose) *
          100
        : null

    return {
      ticker,
      name: result.meta.longName ?? result.meta.shortName ?? null,
      priceCents,
      priceChangePct,
      // Not available from this endpoint — left null rather than guessed.
      priceToEarnings: null,
      dayHighCents: result.meta.regularMarketDayHigh != null ? Math.round(result.meta.regularMarketDayHigh * 100) : null,
      dayLowCents: result.meta.regularMarketDayLow != null ? Math.round(result.meta.regularMarketDayLow * 100) : null,
      fiftyTwoWeekHighCents: result.meta.fiftyTwoWeekHigh != null ? Math.round(result.meta.fiftyTwoWeekHigh * 100) : null,
      fiftyTwoWeekLowCents: result.meta.fiftyTwoWeekLow != null ? Math.round(result.meta.fiftyTwoWeekLow * 100) : null,
      volume: result.meta.regularMarketVolume != null ? BigInt(Math.round(result.meta.regularMarketVolume)) : null,
      priceHistory: mapPriceHistory(result),
      dividends: mapDividends(result),
      // Yahoo's unofficial chart endpoint has no fundamentals/statistics
      // modules at all — always null here, never guessed.
      stock: null,
      source: this.name,
    }
  }
}
