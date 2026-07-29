import type { AssetClass, PriceSource } from "@/generated/prisma/client"

export type { AssetClass, PriceSource }

/// One row for the watchlist selector — never carries items themselves
/// (those are fetched per-list, on demand) so switching between many lists
/// stays a single cheap query instead of loading every list's assets upfront.
export interface WatchlistSummary {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  itemCount: number
  createdAt: string
  updatedAt: string
}

/// One tracked asset, joined live against Company + the same batched
/// price-history/dividend-yield/alert-count helpers the rest of the app
/// already uses — nothing here is stored on WatchlistItem itself, so an
/// item never drifts from what /mercado or /empresa would show for the
/// same ticker right now.
export interface WatchlistItemRow {
  id: string
  watchlistId: string
  companyId: string
  ticker: string
  name: string
  logoUrl: string | null
  assetClass: AssetClass
  priceSource: PriceSource
  sector: string | null
  priceCents: number
  /// Daily change — Company.priceChangePct, same source as everywhere else.
  dailyChangePct: number
  /// Null when the asset doesn't have a real point from ~7/~30 days ago yet
  /// (freshly synced ticker) — never fabricated, rendered as "—".
  weeklyChangePct: number | null
  monthlyChangePct: number | null
  dayHighCents: number | null
  dayLowCents: number | null
  fiftyTwoWeekHighCents: number | null
  fiftyTwoWeekLowCents: number | null
  volume: bigint | null
  marketCapCents: bigint | null
  dividendYieldPct: number
  alertsCount: number
  isFavorited: boolean
  addedAt: string
}

export interface WatchlistClassCount {
  assetClass: AssetClass
  count: number
}

export interface WatchlistTopMover {
  companyId: string
  ticker: string
  name: string
  logoUrl: string | null
  changePct: number
}

/// Backs the stats row at the top of /watchlist — computed across every
/// list a profile owns, not just the one currently selected.
export interface WatchlistStats {
  listCount: number
  totalAssetCount: number
  topGainer: WatchlistTopMover | null
  topLoser: WatchlistTopMover | null
  activeAlertsCount: number
  classDistribution: WatchlistClassCount[]
}

export type WatchlistSortOption =
  | "preco-desc"
  | "preco-asc"
  | "variacao-desc"
  | "variacao-asc"
  | "dy-desc"
  | "dy-asc"
  | "nome"
  | "ticker"
  | "marketcap-desc"
  | "marketcap-asc"
  | "volume-desc"
  | "classe"
  | "setor"

export const WATCHLIST_SORT_LABELS: Record<WatchlistSortOption, string> = {
  "preco-desc": "Maior preço",
  "preco-asc": "Menor preço",
  "variacao-desc": "Maior variação",
  "variacao-asc": "Menor variação",
  "dy-desc": "Maior Dividend Yield",
  "dy-asc": "Menor Dividend Yield",
  nome: "Nome (A-Z)",
  ticker: "Ticker (A-Z)",
  "marketcap-desc": "Maior Market Cap",
  "marketcap-asc": "Menor Market Cap",
  "volume-desc": "Maior volume",
  classe: "Classe de ativo",
  setor: "Setor",
}

export interface WatchlistFilters {
  assetClass: AssetClass | "TODOS"
  sector: string
  precoMinCents: number | null
  precoMaxCents: number | null
  pagadoraDividendos: boolean
}

export const DEFAULT_WATCHLIST_FILTERS: WatchlistFilters = {
  assetClass: "TODOS",
  sector: "",
  precoMinCents: null,
  precoMaxCents: null,
  pagadoraDividendos: false,
}

export interface CreateWatchlistInput {
  name: string
  description?: string
  icon?: string
  color?: string
}

export interface UpdateWatchlistInput {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
}

export interface WatchlistActionResult {
  ok: boolean
  error?: string
}
