import "server-only"

import type { RadarPriority, RadarType } from "@/generated/prisma/client"
import { computeNotificationPriority } from "@/features/alerts/notifications/priority"
import { prisma } from "@/lib/prisma"

// "PETR4 possui 5 novas notícias" (spec's AGRUPAMENTO) — a new event for the
// same (profileId, type, companyId) inside this window collapses into the
// existing unread notification instead of creating a second row. 24h
// mirrors the news feature's own "recent enough to matter" window.
const DEFAULT_GROUP_WINDOW_HOURS = 24

export interface CreateNotificationInput {
  profileId: string
  type: RadarType
  title: string
  body?: string | null
  companyId?: string | null
  /// Auto-computed via computeNotificationPriority(type) when omitted —
  /// only pass this to override the type's default (e.g. a milestone FinIA
  /// insight bumped to Média).
  priority?: RadarPriority
  /// Type-specific quick-action/context payload — see RadarNotification's
  /// schema doc for examples per type.
  metadata?: Record<string, unknown> | null
  /// Idempotency key for "the exact event that would have produced this
  /// row" (e.g. `news:{articleId}`, `dividend:{transactionId}`,
  /// `digest-daily:{date}`) — a second create() call with the same
  /// (profileId, sourceKey) is a guaranteed no-op. Omit only when a producer
  /// genuinely has no natural dedup key.
  sourceKey?: string | null
  groupWindowHours?: number
}

/// The single write path every notification producer (AlertService,
/// recordIncomeAction, news feed hydration, notifications/digest.ts) calls
/// into — mirrors AlertService's own "one entry point, everything else just
/// reads what's already in Postgres" shape. Never throws: a producer's own
/// primary action (recording a trade, refreshing the news feed) must never
/// fail because the notification side-effect did.
export const NotificationService = {
  async create(input: CreateNotificationInput): Promise<void> {
    try {
      const { profileId, type, title } = input
      const companyId = input.companyId ?? null
      const body = input.body ?? null
      const metadata = input.metadata ?? null
      const priority = input.priority ?? computeNotificationPriority(type)
      const sourceKey = input.sourceKey ?? null
      const groupWindowHours = input.groupWindowHours ?? DEFAULT_GROUP_WINDOW_HOURS

      // Same event, already recorded (e.g. a page reload re-running a lazy
      // "ensure" check, or the same article matched twice in one feed page)
      // — never double-insert or double-bump a group count for it.
      if (sourceKey) {
        const existing = await prisma.radarNotification.findFirst({
          where: { profileId, sourceKey },
          select: { id: true },
        })
        if (existing) return
      }

      if (companyId) {
        const groupWindowStart = new Date(Date.now() - groupWindowHours * 60 * 60 * 1000)
        const groupCandidate = await prisma.radarNotification.findFirst({
          where: {
            profileId,
            type,
            companyId,
            status: "PUBLISHED",
            isRead: false,
            createdAt: { gte: groupWindowStart },
          },
          orderBy: { createdAt: "desc" },
        })

        if (groupCandidate) {
          await prisma.radarNotification.update({
            where: { id: groupCandidate.id },
            data: {
              groupCount: groupCandidate.groupCount + 1,
              title,
              body,
              priority,
              metadata: metadata == null ? undefined : (metadata as object),
              sourceKey,
            },
          })
          return
        }
      }

      await prisma.radarNotification.create({
        data: {
          profileId,
          type,
          title,
          body,
          companyId,
          priority,
          status: "PUBLISHED",
          metadata: metadata == null ? undefined : (metadata as object),
          sourceKey,
        },
      })
    } catch (error) {
      console.error("[NotificationService] falha ao criar notificação", error)
    }
  },

  async markRead(profileId: string, id: string): Promise<void> {
    await prisma.radarNotification.updateMany({
      where: { id, profileId },
      data: { isRead: true, readAt: new Date() },
    })
  },

  async markAllRead(profileId: string): Promise<void> {
    await prisma.radarNotification.updateMany({
      where: { profileId, isRead: false, status: "PUBLISHED" },
      data: { isRead: true, readAt: new Date() },
    })
  },

  /// Returns the new pinned state, or null when the notification doesn't
  /// belong to this profile (already deleted, or a stale id from another
  /// session).
  async togglePin(profileId: string, id: string): Promise<{ pinned: boolean } | null> {
    const existing = await prisma.radarNotification.findFirst({
      where: { id, profileId },
      select: { isPinned: true },
    })
    if (!existing) return null

    const pinned = !existing.isPinned
    await prisma.radarNotification.update({
      where: { id },
      data: { isPinned: pinned, pinnedAt: pinned ? new Date() : null },
    })
    return { pinned }
  },

  /// Soft delete — flips status to ARCHIVED (excluded from every feed query
  /// and from group-collapse candidates) rather than removing the row, same
  /// reasoning as PriceAlert's own soft-delete: history isn't destroyed.
  async delete(profileId: string, id: string): Promise<void> {
    await prisma.radarNotification.updateMany({
      where: { id, profileId },
      data: { status: "ARCHIVED" },
    })
  },
}
