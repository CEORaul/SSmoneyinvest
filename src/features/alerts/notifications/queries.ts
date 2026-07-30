import "server-only"

import { Prisma } from "@/generated/prisma/client"
import { NOTIFICATION_FILTER_TYPES, type NotificationFeedResult, type NotificationFilterKey, type NotificationRow } from "@/features/alerts/notifications/types"
import { prisma } from "@/lib/prisma"

const DEFAULT_LIMIT = 20

const NOTIFICATION_INCLUDE = {
  company: { select: { ticker: true, name: true, logoUrl: true, assetClass: true, priceCents: true, priceSource: true } },
} satisfies Prisma.RadarNotificationInclude

type NotificationWithCompany = Prisma.RadarNotificationGetPayload<{ include: typeof NOTIFICATION_INCLUDE }>

function toRow(row: NotificationWithCompany): NotificationRow {
  return {
    id: row.id,
    type: row.type,
    priority: row.priority,
    title: row.title,
    body: row.body,
    companyId: row.companyId,
    ticker: row.company?.ticker ?? null,
    name: row.company?.name ?? null,
    logoUrl: row.company?.logoUrl ?? null,
    assetClass: row.company?.assetClass ?? null,
    priceCents: row.company?.priceCents ?? null,
    priceSource: row.company?.priceSource ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    isRead: row.isRead,
    isPinned: row.isPinned,
    groupCount: row.groupCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

// Offset-based (cursor is just the stringified offset), same reasoning as
// news/queries.ts: a profile's own notification count stays in the
// dozens-to-low-hundreds range even for a very active user, where an OFFSET
// scan on an indexed (profileId, ...) column is plenty fast.
function parseCursor(cursor: string | null | undefined): number {
  const parsed = cursor ? Number(cursor) : 0
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function buildNextCursor(offset: number, limit: number, returned: number): string | null {
  return returned < limit ? null : String(offset + limit)
}

/// Backs the bell's main list — pinned notifications always float to the
/// top, then highest priority, then most recent. ARCHIVED (soft-deleted)
/// rows are always excluded, never just filtered by the caller.
export async function getNotificationsForProfile(
  profileId: string,
  opts: { cursor?: string | null; limit?: number; filter?: NotificationFilterKey }
): Promise<NotificationFeedResult> {
  const limit = opts.limit ?? DEFAULT_LIMIT
  const offset = parseCursor(opts.cursor)
  const filter = opts.filter ?? "all"

  const where: Prisma.RadarNotificationWhereInput = { profileId, status: { not: "ARCHIVED" } }
  if (filter === "unread") {
    where.isRead = false
  } else {
    const types = NOTIFICATION_FILTER_TYPES[filter]
    if (types) where.type = { in: types }
  }

  const rows = await prisma.radarNotification.findMany({
    where,
    include: NOTIFICATION_INCLUDE,
    orderBy: [{ isPinned: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
    skip: offset,
    take: limit,
  })

  return {
    notifications: rows.map(toRow),
    nextCursor: buildNextCursor(offset, limit, rows.length),
  }
}

export async function getUnreadNotificationsCount(profileId: string): Promise<number> {
  return prisma.radarNotification.count({
    where: { profileId, status: { not: "ARCHIVED" }, isRead: false },
  })
}
