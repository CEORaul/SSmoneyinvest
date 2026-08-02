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
  /// Whether `getCompanyDetailsBatch` is implemented and safe to call —
  /// distinct from `details` since a provider can support one ticker at a
  /// time without supporting a real multi-ticker request (Yahoo's chart
  /// endpoint, for instance, has no batch shape at all).
  readonly batch: boolean
  /// Whether `getCompanyStatementsBatch` (financial-statement history —
  /// Balanço/DRE/Fluxo de Caixa/DVA, annual + quarterly) is implemented.
  /// A distinct flag from `batch` since a provider can support ordinary
  /// batched quotes without exposing statement history at all (Yahoo).
  readonly statements: boolean
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

  /// Same data as `getCompanyDetails`, for many tickers in one request —
  /// OPTIONAL so every existing/future provider that doesn't support real
  /// batching (Yahoo today) keeps compiling untouched; this is a strict
  /// extension of the interface, never a breaking change. Callers must
  /// check `capabilities.batch` before calling this. Missing/invalid
  /// tickers are simply absent from the returned map, never thrown for.
  getCompanyDetailsBatch?(
    tickers: string[],
    range: PriceRange
  ): Promise<Map<string, CompanyDetails>>

  /// Same shape as `getCompanyDetailsBatch`, but the returned `CompanyDetails.
  /// statements` field is populated (see CompanyStatementsInput) — a
  /// separate, heavier request most providers never need to make on every
  /// sync tick. OPTIONAL for the same reason `getCompanyDetailsBatch` is.
  getCompanyStatementsBatch?(
    tickers: string[],
    range: PriceRange
  ): Promise<Map<string, CompanyDetails>>
}
