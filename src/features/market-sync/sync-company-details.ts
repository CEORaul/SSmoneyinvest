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
      // Ask for as much history as the provider is willing to give — "max"
      // instead of the default "1y". BRAPI's plan tier caps most tickers to
      // a 1d/5d/1mo/3mo range no matter what's requested here (confirmed
      // live via BRAPI's own rejection message: "O range ... não está
      // disponível no seu plano"), so this changes nothing for them — the
      // existing fallback in brapi-provider.ts already handles it. It only
      // matters for the handful of tickers BRAPI doesn't restrict (its free
      // sandbox symbols, e.g. PETR4/VALE3), which were previously stuck at
      // 1 year of history purely because we never asked for more — verified
      // live that "max" gets 26 years of real daily data for those.
      // Trade-off, documented rather than hidden: if BRAPI is ever fully
      // down for a ticker and this falls over to Yahoo, Yahoo's endpoint
      // silently returns monthly (not daily) candles specifically for a
      // "max" request (confirmed live) — real data, just coarser for that
      // one rare path; every other period (1M/6M/1A/5A) keeps Yahoo's daily
      // granularity, and 1A/5A on BRAPI are unaffected either way.
      const outcome = await marketDataService.refreshCompanyDetails(company.ticker, "max")
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
