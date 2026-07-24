import type { AssetClass, PriceSource } from "@/generated/prisma/client"

/// Shared shapes for /mercado — kept separate from discovery-queries.ts so
/// client components can import types without pulling in "server-only" code.

export interface MarketFilters {
  categoria: AssetClass | "TODOS"
  setor: string | ""
  precoMinCents: number | null
  precoMaxCents: number | null
  dyMinPct: number | null
  plMax: number | null
  pvpMax: number | null
  roeMinPct: number | null
  liquidezMin: number | null
  marketCapMinCents: number | null
  pagadoraDividendos: boolean
}

export const DEFAULT_MARKET_FILTERS: MarketFilters = {
  categoria: "TODOS",
  setor: "",
  precoMinCents: null,
  precoMaxCents: null,
  dyMinPct: null,
  plMax: null,
  pvpMax: null,
  roeMinPct: null,
  liquidezMin: null,
  marketCapMinCents: null,
  pagadoraDividendos: false,
}

/// Filters the spec asks for that have no real backing data source yet
/// (no B3 index-membership sync, no official free-float small-cap/blue-chip
/// classification, no listing-date field) — kept as a fixed list so the UI
/// can render them as genuinely interactive controls that always explain
/// why they don't narrow results yet, per "nunca inventar números."
export type UnavailableMarketFilterKey =
  | "pais"
  | "ibovespa"
  | "smallCaps"
  | "blueChips"
  | "tagAlong"
  | "novo"

export const UNAVAILABLE_FILTER_LABELS: Record<UnavailableMarketFilterKey, string> = {
  pais: "País",
  ibovespa: "Participa do Ibovespa",
  smallCaps: "Small Caps",
  blueChips: "Blue Chips",
  tagAlong: "Tag Along",
  novo: "Novo",
}

export const UNAVAILABLE_FILTER_MESSAGE = "Dado disponível quando sincronizado."

export type MarketSortOption =
  | "relevancia"
  | "dy-desc"
  | "dy-asc"
  | "change-desc"
  | "change-asc"
  | "volume-desc"
  | "marketcap-desc"
  | "marketcap-asc"
  | "roe-desc"
  | "pl-asc"
  | "alfabetica"
  | "price-desc"
  | "price-asc"

export const MARKET_SORT_LABELS: Record<MarketSortOption, string> = {
  relevancia: "Relevância",
  "dy-desc": "Maior Dividend Yield",
  "dy-asc": "Menor Dividend Yield",
  "change-desc": "Maior valorização",
  "change-asc": "Maior desvalorização",
  "volume-desc": "Maior liquidez",
  "marketcap-desc": "Maior Market Cap",
  "marketcap-asc": "Menor Market Cap",
  "roe-desc": "Maior ROE",
  "pl-asc": "Menor P/L",
  alfabetica: "Ordem alfabética",
  "price-desc": "Maior preço",
  "price-asc": "Menor preço",
}

export interface MarketAssetRow {
  id: string
  ticker: string
  name: string
  logoUrl: string | null
  assetClass: AssetClass
  priceSource: PriceSource
  sector: string | null
  priceCents: number
  priceChangePct: number
  /// Trailing-12-month, computed from real DividendPayment rows — never
  /// the Stock/Fii/Etf.dividendYield column (never populated by any sync,
  /// see dividend-yield.ts). Null only means "not computed for this row,"
  /// which never actually happens for a row this query returns (always at
  /// least 0) — kept nullable in the type for future data sources that may
  /// genuinely not have a computable value.
  dividendYieldPct: number | null
  priceToEarnings: number | null
  priceToBook: number | null
  roe: number | null
  marketCapCents: bigint | null
  volume: bigint | null
}

export interface MarketSearchResult {
  rows: MarketAssetRow[]
  totalCount: number
}

export type MarketView = "table" | "cards"

export interface SavedMarketFilterSummary {
  id: string
  name: string
  filters: MarketFilters
  sort: MarketSortOption
  createdAt: string
}
