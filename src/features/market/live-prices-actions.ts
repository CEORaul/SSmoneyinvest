"use server"

import { getLiveMarketPrices, type LiveMarketPrice } from "@/features/market/live-prices"
import { MARKET_REFRESH_MAX_BATCH } from "@/lib/market-refresh/config"

/// The single Server Action every page's LiveMarketStore calls — a
/// batched, deduplicated, Prisma-only read (see live-prices.ts). Never
/// triggers a BRAPI/Yahoo call, so this can run on a client timer safely
/// without risking provider rate limits.
export async function getLiveMarketPricesAction(companyIds: string[]): Promise<LiveMarketPrice[]> {
  const deduped = [...new Set(companyIds)].slice(0, MARKET_REFRESH_MAX_BATCH)
  return getLiveMarketPrices(deduped)
}
