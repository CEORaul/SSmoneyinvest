import "server-only"

import { prisma } from "@/lib/prisma"

export interface LiveMarketPrice {
  id: string
  priceCents: number
  priceChangePct: number
  volume: bigint | null
  marketCapCents: bigint | null
}

/// The one Prisma-only read behind the app's silent auto-refresh — never
/// calls MarketDataService or a provider (BRAPI/Yahoo), so it's safe to run
/// on a client-driven timer without touching any rate limit. Postgres is
/// already the cache (see MarketDataService's own doc comment); this
/// simply reads it. Freshness of the underlying rows still depends
/// entirely on whatever already keeps Company rows updated (cron sync,
/// admin sync, or PriceSyncStatus's own trigger on /carteira) — this
/// function's only job is letting already-open pages notice a change
/// without a full reload.
export async function getLiveMarketPrices(companyIds: string[]): Promise<LiveMarketPrice[]> {
  if (companyIds.length === 0) return []

  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds } },
    select: { id: true, priceCents: true, priceChangePct: true, volume: true, marketCapCents: true },
  })

  return companies.map((company) => ({
    id: company.id,
    priceCents: company.priceCents,
    priceChangePct: Number(company.priceChangePct),
    volume: company.volume,
    marketCapCents: company.marketCapCents,
  }))
}
