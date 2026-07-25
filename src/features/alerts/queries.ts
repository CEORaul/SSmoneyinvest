import "server-only"

import { prisma } from "@/lib/prisma"
import type { AlertNotificationRow, PriceAlertRow } from "@/features/alerts/types"

const ALERT_INCLUDE = {
  company: {
    select: { ticker: true, name: true, logoUrl: true, assetClass: true, priceCents: true },
  },
} as const

export async function getAlertsForProfile(profileId: string): Promise<PriceAlertRow[]> {
  const rows = await prisma.priceAlert.findMany({
    where: { profileId, status: { not: "CANCELED" } },
    include: ALERT_INCLUDE,
    orderBy: { createdAt: "desc" },
  })

  return rows.map((row) => ({
    id: row.id,
    companyId: row.companyId,
    ticker: row.company.ticker,
    name: row.company.name,
    logoUrl: row.company.logoUrl,
    assetClass: row.company.assetClass,
    currentPriceCents: row.company.priceCents,
    direction: row.direction,
    targetPriceCents: row.targetPriceCents,
    status: row.status,
    triggeredAt: row.triggeredAt?.toISOString() ?? null,
    triggeredPriceCents: row.triggeredPriceCents,
    createdAt: row.createdAt.toISOString(),
  }))
}

/// Used by the create-alert validation to reject exact duplicates — scoped
/// to ACTIVE alerts only, so a canceled or already-triggered alert with the
/// same company/direction/target never blocks recreating it.
export async function findActiveDuplicateAlert(
  profileId: string,
  companyId: string,
  direction: "ABOVE" | "BELOW",
  targetPriceCents: number
) {
  return prisma.priceAlert.findFirst({
    where: { profileId, companyId, direction, targetPriceCents, status: "ACTIVE" },
    select: { id: true },
  })
}

export async function getRecentNotificationsForProfile(
  profileId: string,
  limit = 20
): Promise<AlertNotificationRow[]> {
  const rows = await prisma.alertNotification.findMany({
    where: { profileId },
    include: { company: { select: { ticker: true, name: true, logoUrl: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return rows.map((row) => ({
    id: row.id,
    alertId: row.alertId,
    companyId: row.companyId,
    ticker: row.company.ticker,
    name: row.company.name,
    logoUrl: row.company.logoUrl,
    direction: row.direction,
    targetPriceCents: row.targetPriceCents,
    triggeredPriceCents: row.triggeredPriceCents,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function getUnreadNotificationCount(profileId: string): Promise<number> {
  return prisma.alertNotification.count({ where: { profileId, status: "UNREAD" } })
}
