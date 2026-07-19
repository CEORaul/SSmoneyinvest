import type { AssetClass, DividendType } from "@/generated/prisma/client"

/// Cheap, broad-coverage row from a provider's bulk listing endpoint —
/// the source for "buscar empresas automaticamente" and baseline price sync.
export interface CompanyDirectoryEntry {
  ticker: string
  name: string
  assetClass: AssetClass
  sector: string | null
  segment: string | null
  logoUrl: string | null
  priceCents: number
  priceChangePct: number
  marketCapCents: bigint | null
  /// Same purpose as CompanyDetails.source — currently always the one
  /// provider whose capabilities.directory is true, but tracked per-entry
  /// so that stays true even if that ever changes.
  source: string
}

export interface PricePoint {
  date: Date
  closeCents: number
}

export interface DividendEvent {
  type: DividendType
  amountPerShare: number
  exDate: Date
  paymentDate: Date | null
}

/// Per-ticker deep data — dividends, price history and whatever
/// fundamentals the provider exposes at the caller's plan tier. Fields the
/// provider doesn't return are simply absent, never fabricated.
export interface CompanyDetails {
  ticker: string
  name: string | null
  priceCents: number | null
  priceChangePct: number | null
  priceToEarnings: number | null
  priceHistory: PricePoint[]
  dividends: DividendEvent[]
  /// The provider's own `name` (e.g. "brapi.dev", "yahoo-finance") — lets
  /// callers that persist this data (portfolio-service's historical price
  /// lookup) record which source actually supplied it, even when called
  /// through ProviderManager's failover.
  source: string
}

export type PriceRange = "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "max"
