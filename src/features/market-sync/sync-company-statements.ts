import "server-only"

import { runSyncJob } from "@/features/market-sync/run-sync"
import { prisma } from "@/lib/prisma"
import { marketDataService } from "@/services/market-data-service"

// Same batching rationale as sync-company-details.ts — up to 20 tickers
// per BRAPI request. Deliberately smaller than COMPANY_DETAILS' BATCH_SIZE:
// this job's payload per ticker is far heavier (8 statement-history arrays,
// often 60+ periods each), so a run stays comfortably inside a cron
// invocation's time budget even at a lower per-run company count. Meant to
// run weekly, not daily — financial statements only change quarterly, so a
// daily cadence here would burn the Pro plan's request budget on data that
// almost never differs run-to-run (see the final BRAPI Pro integration
// report for the exact request-volume math).
const BATCH_SIZE = 100

/// Financial-statement history (Balanço/DRE/Fluxo de Caixa/DVA, annual +
/// quarterly), real split/bonus-share history, and richer dividend fields —
/// everything the daily details sync deliberately excludes to keep its own
/// payload light (see sync-company-details.ts). Only STOCK/BDR companies
/// have real financial statements to sync; FIIs/ETFs are skipped here
/// entirely rather than wastefully requesting modules that don't apply to
/// them (their own fundamentals still come from the daily details sync).
export async function syncCompanyStatements() {
  return runSyncJob("COMPANY_STATEMENTS", async () => {
    const companies = await prisma.company.findMany({
      where: { assetClass: { in: ["STOCK", "BDR"] } },
      orderBy: [{ statementsSyncedAt: { sort: "asc", nulls: "first" } }, { ticker: "asc" }],
      take: BATCH_SIZE,
      select: { ticker: true },
    })

    return marketDataService.refreshCompanyStatements(
      companies.map((c) => c.ticker),
      "max"
    )
  })
}
