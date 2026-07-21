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
  /// From /quote/list's own `volume` field — already universal (every
  /// ticker, every 5-minute sync), unlike day-high/low and 52-week range
  /// which only come from the per-ticker quote endpoint (see CompanyDetails).
  volume: bigint | null
  /// Same purpose as CompanyDetails.source — currently always the one
  /// provider whose capabilities.directory is true, but tracked per-entry
  /// so that stays true even if that ever changes.
  source: string
}

export interface PricePoint {
  date: Date
  closeCents: number
  volume: bigint | null
}

export interface DividendEvent {
  type: DividendType
  amountPerShare: number
  exDate: Date
  paymentDate: Date | null
}

/// Extra per-ticker fundamentals only BRAPI's premium `defaultKeyStatistics`/
/// `financialData`/`summaryProfile` modules provide — on the current plan
/// tier that's just the 4 sandbox tickers (PETR4/VALE3/ITUB4/MGLU3), so
/// every field here is null for the rest of the universe until upgrade.
/// Every field maps 1:1 to a nullable Stock column (see prisma/schema.prisma).
export interface CompanyStockDetails {
  priceToBook: number | null
  psr: number | null
  evToEbit: number | null
  evToEbitda: number | null
  roe: number | null
  roic: number | null
  roa: number | null
  grossMargin: number | null
  ebitdaMargin: number | null
  netMargin: number | null
  dividendYield: number | null
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
  description: string | null
  sector: string | null
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
  /// Day/52-week range + volume — from the per-ticker quote's base payload,
  /// available for every ticker regardless of plan tier (unlike the modules-
  /// gated fields in `stock` below).
  dayHighCents: number | null
  dayLowCents: number | null
  fiftyTwoWeekHighCents: number | null
  fiftyTwoWeekLowCents: number | null
  volume: bigint | null
  priceHistory: PricePoint[]
  dividends: DividendEvent[]
  /// Present only when the plan/ticker combination allowed the premium
  /// modules request to succeed (see BrapiProvider.getCompanyDetails's
  /// full-then-reduced retry) — null otherwise, never partially guessed.
  stock: CompanyStockDetails | null
  /// The provider's own `name` (e.g. "brapi.dev", "yahoo-finance") — lets
  /// callers that persist this data (portfolio-service's historical price
  /// lookup) record which source actually supplied it, even when called
  /// through ProviderManager's failover.
  source: string
}

export type PriceRange = "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "max"
