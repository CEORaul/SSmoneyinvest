export type { AssetClass, TransactionType, DividendType } from "@/generated/prisma/client"

/// Minimal shape a company-listing card needs — satisfied by both mock
/// landing-page data and (eventually) real Company query results.
export interface CompanyListItem {
  /// Optional (not every producer of this shape has a real Company row's id
  /// handy without an extra mapping pass) — populated by every query in
  /// features/market/queries.ts and features/search/queries.ts's
  /// getTopByVolume, which is what Mercado 2.0's movers cards read it from
  /// for their "abrir ativo" link/action.
  id?: string
  ticker: string
  name: string
  logoUrl: string | null
  priceCents: number
  changePct: number
  dividendYield: number
  /// Same optional-producer reasoning as `id` — populated wherever the
  /// underlying Company row is already fetched in full.
  volume?: bigint | null
}
