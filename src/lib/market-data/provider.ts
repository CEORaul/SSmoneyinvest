import type {
  CompanyDetails,
  CompanyDirectoryEntry,
  PriceRange,
} from "@/lib/market-data/types"

/// Everything that talks to an external market-data API implements this —
/// swapping providers means writing one new class, nothing else changes.
export interface MarketDataProvider {
  readonly name: string

  /** Full (or best-effort) market universe with basic quote data. */
  listCompanyDirectory(): Promise<CompanyDirectoryEntry[]>

  /** Deep per-ticker data: dividends, price history, fundamentals. */
  getCompanyDetails(
    ticker: string,
    range: PriceRange
  ): Promise<CompanyDetails | null>
}
