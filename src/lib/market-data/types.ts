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
  /// Everything below is only ever populated from BRAPI's `dividendsData.
  /// cashDividends` shape (confirmed live) — Yahoo's chart-endpoint dividend
  /// events carry none of it, so these stay null for that provider.
  relatedTo: string | null
  isinCode: string | null
  remarks: string | null
  approvedOn: Date | null
}

/// One BRAPI `dividendsData.stockDividends[]` entry — real corporate-action
/// history (confirmed live against a non-sandbox ticker), backing
/// "Grupamentos/Desdobramentos". `type` is derived from BRAPI's own `label`
/// ("DESDOBRAMENTO" = a split, "BONIFICACAO" = a bonus-share event) — see
/// STOCK_SPLIT_TYPE_BY_LABEL in brapi-provider.ts.
export interface StockSplitInput {
  type: "SPLIT" | "BONUS"
  factor: number
  completeFactor: string | null
  isinCode: string | null
  approvedOn: Date
  lastDatePrior: Date | null
}

/// One BRAPI statement-history period (balanceSheetHistory/incomeStatement
/// History/cashflowHistory/valueAddedHistory, annual or quarterly variant) —
/// `curated` holds the specific fields this app maps to real Prisma columns
/// (see market-data-service.ts's statement write path); `raw` keeps the full
/// BRAPI period object verbatim so nothing is lost even if a field this app
/// doesn't curate today becomes useful later.
export interface StatementPeriodInput {
  endDate: Date
  curated: Record<string, number | null>
  raw: Record<string, unknown>
}

export interface CompanyStatementsInput {
  balanceSheet: StatementPeriodInput[]
  balanceSheetQuarterly: StatementPeriodInput[]
  incomeStatement: StatementPeriodInput[]
  incomeStatementQuarterly: StatementPeriodInput[]
  cashFlow: StatementPeriodInput[]
  cashFlowQuarterly: StatementPeriodInput[]
  valueAdded: StatementPeriodInput[]
  valueAddedQuarterly: StatementPeriodInput[]
}

/// Extra per-ticker fundamentals from BRAPI's `defaultKeyStatistics`/
/// `financialData`/`summaryProfile` modules — every field maps 1:1 to a
/// nullable Stock column (see prisma/schema.prisma). Present for any ticker
/// the caller's plan/token allows (confirmed live: a Pro token gets full
/// coverage, not just BRAPI's 4 free sandbox symbols) — null only when the
/// provider genuinely didn't return a value, never gated by a hardcoded
/// ticker allowlist in this app's own code.
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
  freeCashFlowCents: bigint | null
  operatingCashFlowCents: bigint | null
  description: string | null
  sector: string | null
  /// From `summaryProfile.fullTimeEmployees`/`website` — company-level in
  /// spirit but only ever returned alongside the same premium modules as
  /// the rest of this interface, so mapped here rather than on the always-
  /// available base quote payload.
  employees: number | null
  website: string | null
}

/// FII-specific fields BRAPI actually returns (confirmed live against a
/// real FII ticker) — `priceToBook`/`dividendYield` come from the same
/// `defaultKeyStatistics` module stocks use, `administrator` from
/// `summaryProfile.administratorName`. BRAPI has no confirmed field for
/// managementFee/vacancyRate/propertyCount/quotaCount at any tier — those
/// `Fii` columns stay null, never guessed.
export interface CompanyFiiDetailsInput {
  priceToBook: number | null
  dividendYield: number | null
  administrator: string | null
  netWorthCents: bigint | null
}

/// ETF-specific fields BRAPI returns — only dividendYield is confirmed real;
/// benchmarkIndex/expenseRatio/navCents have no confirmed BRAPI field.
export interface CompanyEtfDetailsInput {
  dividendYield: number | null
}

/// Per-ticker deep data — dividends, price history and whatever
/// fundamentals the provider exposes. Fields the provider doesn't return
/// are simply absent, never fabricated.
export interface CompanyDetails {
  ticker: string
  name: string | null
  priceCents: number | null
  priceChangePct: number | null
  priceToEarnings: number | null
  /// Day/52-week range + volume — from the per-ticker quote's base payload,
  /// available for every ticker (unlike the modules-gated fields in `stock`
  /// below, which depend on the caller's plan/token entitlements).
  dayHighCents: number | null
  dayLowCents: number | null
  fiftyTwoWeekHighCents: number | null
  fiftyTwoWeekLowCents: number | null
  volume: bigint | null
  priceHistory: PricePoint[]
  dividends: DividendEvent[]
  /// Real split/bonus-share history — only ever populated by the weekly
  /// "statements" sync request (see market-data-service.refreshCompanyStatements),
  /// since it comes from the same `dividendsData` the dividends array does.
  splits: StockSplitInput[]
  /// Present only when the plan/token allowed the premium modules request
  /// to succeed — null otherwise, never partially guessed.
  stock: CompanyStockDetails | null
  /// Present only for FII/ETF-classed tickers when the provider actually
  /// returned that shape — MarketDataService decides which one to persist
  /// based on the Company's own assetClass, not the provider.
  fii: CompanyFiiDetailsInput | null
  etf: CompanyEtfDetailsInput | null
  /// Only populated by the weekly statements request (see
  /// refreshCompanyStatements) — absent on the daily fundamentals request,
  /// so a daily sync can never accidentally overwrite good weekly data with
  /// nothing.
  statements: CompanyStatementsInput | null
  /// The provider's own `name` (e.g. "brapi.dev", "yahoo-finance") — lets
  /// callers that persist this data (portfolio-service's historical price
  /// lookup) record which source actually supplied it, even when called
  /// through ProviderManager's failover.
  source: string
}

export type PriceRange = "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "max"
