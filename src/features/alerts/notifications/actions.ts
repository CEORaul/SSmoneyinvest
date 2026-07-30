"use server"

import { ensureDailyDigest, ensureDailyFiniaInsights, ensureDailyRadarOpportunity, ensureWeeklyDigest } from "@/features/alerts/notifications/digest"
import { getNotificationsForProfile, getUnreadNotificationsCount } from "@/features/alerts/notifications/queries"
import { NotificationService } from "@/features/alerts/notifications/service"
import type { NotificationActionResult, NotificationFeedResult, NotificationFilterKey } from "@/features/alerts/notifications/types"
import { requireUser } from "@/lib/auth/session"

export interface NotificationFeedActionInput {
  cursor?: string | null
  limit?: number
  filter?: NotificationFilterKey
}

/// The bell's full-list fetch (open, filter change, "load more") — unlike
/// getUnreadNotificationsCountAction (the cheap 45s poll), this is where the
/// once-a-day/once-a-week lazy digest generation runs, and only on the
/// FIRST page (no cursor yet): each ensure* call is sourceKey-gated to a
/// single cheap lookup once it's already run today, but there's no reason
/// to even attempt that on a "load more" page 2/3/4 request.
export async function getNotificationsAction(input: NotificationFeedActionInput): Promise<NotificationFeedResult> {
  const profile = await requireUser()

  if (!input.cursor) {
    await Promise.all([
      ensureDailyDigest(profile.id),
      ensureWeeklyDigest(profile.id),
      ensureDailyFiniaInsights(profile.id),
      ensureDailyRadarOpportunity(profile.id),
    ])
  }

  return getNotificationsForProfile(profile.id, input)
}

export async function getUnreadNotificationsCountAction(): Promise<number> {
  const profile = await requireUser()
  return getUnreadNotificationsCount(profile.id)
}

export async function markNotificationReadAction(id: string): Promise<NotificationActionResult> {
  const profile = await requireUser()
  await NotificationService.markRead(profile.id, id)
  return { ok: true }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const profile = await requireUser()
  await NotificationService.markAllRead(profile.id)
  return { ok: true }
}

export async function togglePinNotificationAction(
  id: string
): Promise<NotificationActionResult & { pinned?: boolean }> {
  const profile = await requireUser()
  const result = await NotificationService.togglePin(profile.id, id)
  if (!result) return { ok: false, error: "Notificação não encontrada." }
  return { ok: true, pinned: result.pinned }
}

export async function deleteNotificationAction(id: string): Promise<NotificationActionResult> {
  const profile = await requireUser()
  await NotificationService.delete(profile.id, id)
  return { ok: true }
}
