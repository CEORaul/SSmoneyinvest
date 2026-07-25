import "server-only"

import { prisma } from "@/lib/prisma"

/// The entire "disparo" pipeline in one batched call — called by
/// MarketDataService right after it writes a new priceCents for a company,
/// never on a separate poll/cron and never by querying the provider again.
/// One query finds every ACTIVE alert whose condition the new price already
/// satisfies (regardless of how many different users own one), one
/// transaction flips them all to TRIGGERED and writes their notification
/// rows — so a single synced price validates every matching alert in O(1)
/// round trips, not one query per alert. Alerts already TRIGGERED are
/// excluded by the `status: "ACTIVE"` filter, which is also what stops an
/// alert from re-firing while the price stays past the target — it only
/// starts matching this query again once the user reactivates it (back to
/// ACTIVE) or creates a new one.
export async function checkPriceAlertsForCompany(companyId: string, priceCents: number): Promise<number> {
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

  return matches.length
}
