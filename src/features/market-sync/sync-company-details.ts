import "server-only"

import { runSyncJob } from "@/features/market-sync/run-sync"
import { prisma } from "@/lib/prisma"
import { marketDataService } from "@/services/market-data-service"

// Keeps each cron invocation short and inside the provider's rate limit —
// tune alongside the cron schedule and BRAPI_API_TOKEN plan tier.
const BATCH_SIZE = 25

/// Deep per-ticker refresh (dividends, price history, fundamentals).
/// Processes the least-recently-refreshed companies first so the whole
/// universe rotates through over successive runs instead of only ever
/// retrying the same head-of-list tickers. Meant to run daily.
export async function syncCompanyDetails() {
  return runSyncJob("COMPANY_DETAILS", async () => {
    // `ticker` is a tiebreaker: thousands of rows share the same (null)
    // detailsSyncedAt before their first sync, and Postgres doesn't
    // guarantee a stable order among ties without a secondary sort key —
    // without it, the same tickers can resurface batch after batch instead
    // of the rotation actually advancing.
    const companies = await prisma.company.findMany({
      orderBy: [{ detailsSyncedAt: { sort: "asc", nulls: "first" } }, { ticker: "asc" }],
      take: BATCH_SIZE,
      select: { ticker: true },
    })

    const errors: string[] = []
    let processed = 0
    let failed = 0

    for (const company of companies) {
      const outcome = await marketDataService.refreshCompanyDetails(company.ticker)
      if (outcome.ok) {
        processed += 1
      } else {
        failed += 1
        errors.push(`${company.ticker}: ${outcome.reason}`)
      }
    }

    return { processed, failed, errors }
  })
}
