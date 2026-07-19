export type { AssetClass, TransactionType, DividendType } from "@/generated/prisma/client"

/// Minimal shape a company-listing card needs — satisfied by both mock
/// landing-page data and (eventually) real Company query results.
export interface CompanyListItem {
  ticker: string
  name: string
  logoUrl: string | null
  priceCents: number
  changePct: number
  dividendYield: number
}
