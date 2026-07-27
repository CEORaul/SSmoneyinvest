import "server-only"

import { prisma } from "@/lib/prisma"

interface CheckAlertsForTickerParams {
  ticker: string
  companyId: string
  priceCents: number
}

/// The single entry point MarketDataService calls right after it writes a
/// new priceCents for a company — never on a separate poll/cron, and never
/// by asking BRAPI (or any provider) again. Everything below reads only
/// what's already in Postgres.
///
/// One query finds every ACTIVE alert scoped to THIS company whose
/// condition the new price already satisfies (indexed on
/// [companyId, status, direction] — never a table scan over every alert in
/// the database, regardless of how many users or tickers exist), and one
/// transaction flips them all to TRIGGERED and writes their notification
/// rows in a single batch. A price update that matches zero, one, or ten
/// thousand alerts costs the same two round trips either way.
///
/// Alerts already TRIGGERED are excluded by the `status: "ACTIVE"` filter —
/// that's also what stops an alert from firing again while the price stays
/// past the target. It only becomes a candidate again once the user
/// reactivates it or edits/creates a new one (both flows reset status back
/// to ACTIVE elsewhere in actions.ts).
export const AlertService = {
  async checkAlertsForTicker({ ticker, companyId, priceCents }: CheckAlertsForTickerParams): Promise<number> {
    const matches = await prisma.priceAlert.findMany({
      where: {
        companyId,
        status: "ACTIVE",
        OR: [
          { direction: "ABOVE", targetPriceCents: { lte: priceCents } },
          { direction: "BELOW", targetPriceCents: { gte: priceCents } },
        ],
      },
      select: { id: true, profileId: true, direction: true, targetPriceCents: true },
    })

    if (matches.length === 0) return 0

    const triggeredAt = new Date()
    await prisma.$transaction([
      prisma.priceAlert.updateMany({
        where: { id: { in: matches.map((match) => match.id) } },
        data: { status: "TRIGGERED", triggeredAt, triggeredPriceCents: priceCents },
      }),
      prisma.alertNotification.createMany({
        data: matches.map((match) => ({
          profileId: match.profileId,
          alertId: match.id,
          companyId,
          direction: match.direction,
          targetPriceCents: match.targetPriceCents,
          triggeredPriceCents: priceCents,
        })),
      }),
    ])

    for (const match of matches) {
      console.info(
        `[AlertService] alerta disparado id=${match.id} profileId=${match.profileId} ticker=${ticker} ` +
          `direction=${match.direction} target=${match.targetPriceCents} price=${priceCents}`
      )
    }
    console.info(`[AlertService] notificação criada count=${matches.length} ticker=${ticker}`)

    return matches.length
  },
}
