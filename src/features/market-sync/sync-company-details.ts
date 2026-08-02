import "server-only"

import { runSyncJob } from "@/features/market-sync/run-sync"
import { prisma } from "@/lib/prisma"
import { marketDataService } from "@/services/market-data-service"

// Companies selected per cron invocation. Batching (see
// refreshCompanyDetailsBatch) turns this into ~1 HTTP request per 20
// companies instead of 1-per-company, so a much larger number now fits
// comfortably inside one invocation's time/rate-limit budget than when
// this job made one sequential request per ticker.
const BATCH_SIZE = 500

/// Deep refresh (dividends, price history, daily fundamentals — NOT the
/// heavier statement-history modules, see sync-company-statements.ts for
/// those) for the least-recently-refreshed companies first, so the whole
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

    // Ask for as much history as the provider is willing to give — "max"
    // instead of a shorter default. Confirmed live on the current (Pro)
    // token: any ticker, not just BRAPI's free sandbox symbols, returns
    // 13-18+ years of real daily data for "max". If BRAPI is ever fully
    // down for a ticker and this falls over to Yahoo, Yahoo's endpoint
    // silently returns monthly (not daily) candles specifically for a
    // "max" request (confirmed live) — real data, just coarser for that
    // one rare path; every other period (1M/6M/1A/5A) keeps Yahoo's daily
    // granularity, and 1A/5A on BRAPI are unaffected either way.
    return marketDataService.refreshCompanyDetailsBatch(
      companies.map((c) => c.ticker),
      "max"
    )
  })
}
