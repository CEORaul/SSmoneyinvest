import type {
  CompanyDetails,
  CompanyDirectoryEntry,
  PriceRange,
} from "@/lib/market-data/types"

/// What a provider can actually do — not every provider offers a bulk
/// market listing (Yahoo Finance's unofficial API is per-ticker only, for
/// example). ProviderManager reads this to route requests only to
/// providers that can serve them, instead of trying-and-catching everyone.
export interface ProviderCapabilities {
  readonly directory: boolean
  readonly details: boolean
}

/// Everything that talks to an external market-data API implements this —
/// swapping providers means writing one new class, nothing else changes.
export interface MarketDataProvider {
  readonly name: string
  readonly capabilities: ProviderCapabilities

  /** Full (or best-effort) market universe with basic quote data. */
  listCompanyDirectory(): Promise<CompanyDirectoryEntry[]>

  /** Deep per-ticker data: dividends, price history, fundamentals. */
  getCompanyDetails(
    ticker: string,
    range: PriceRange
  ): Promise<CompanyDetails | null>
}
