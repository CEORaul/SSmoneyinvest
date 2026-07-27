"use server"

import { revalidatePath } from "next/cache"

import { AlertService } from "@/features/alerts/alert-service"
import {
  findActiveDuplicateAlert,
  getAlertsForProfile,
  getRecentNotificationsForProfile,
  getUnreadNotificationCount,
} from "@/features/alerts/queries"
import { createAlertSchema, updateAlertSchema } from "@/features/alerts/schemas"
import type { AlertActionResult, AlertNotificationRow, PriceAlertRow } from "@/features/alerts/types"
import { requireUser } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export async function getAlertsAction(): Promise<PriceAlertRow[]> {
  const profile = await requireUser()
  return getAlertsForProfile(profile.id)
}

export async function createAlertAction(input: {
  companyId: string
  direction: "ABOVE" | "BELOW"
  targetPriceCents: number
}): Promise<AlertActionResult> {
  const parsed = createAlertSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const profile = await requireUser()
  const { companyId, direction, targetPriceCents } = parsed.data

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, ticker: true, priceCents: true },
  })
  if (!company) return { ok: false, error: "Ativo não encontrado." }

  const duplicate = await findActiveDuplicateAlert(profile.id, companyId, direction, targetPriceCents)
  if (duplicate) return { ok: false, error: "Você já tem um alerta idêntico para este ativo." }

  try {
    const alert = await prisma.priceAlert.create({
      data: { profileId: profile.id, companyId, direction, targetPriceCents },
    })
    console.info(
      `[AlertService] alerta criado id=${alert.id} profileId=${profile.id} ticker=${company.ticker} ` +
        `direction=${direction} target=${targetPriceCents}`
    )
    // The target may already be past the current price at creation time
    // (e.g. "PETR4 abaixo de R$ 40" when it's already at R$ 35) — check
    // immediately so the user isn't left waiting for the next sync.
    await AlertService.checkAlertsForTicker({ ticker: company.ticker, companyId: alert.companyId, priceCents: company.priceCents })
  } catch {
    return { ok: false, error: "Não foi possível criar o alerta." }
  }

  revalidatePath("/alertas")
  return { ok: true }
}

export async function updateAlertAction(input: {
  id: string
  direction: "ABOVE" | "BELOW"
  targetPriceCents: number
}): Promise<AlertActionResult> {
  const parsed = updateAlertSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const profile = await requireUser()
  const { id, direction, targetPriceCents } = parsed.data

  const existing = await prisma.priceAlert.findFirst({ where: { id, profileId: profile.id } })
  if (!existing) return { ok: false, error: "Alerta não encontrado." }

  const duplicate = await findActiveDuplicateAlert(profile.id, existing.companyId, direction, targetPriceCents)
  if (duplicate && duplicate.id !== id) {
    return { ok: false, error: "Você já tem um alerta idêntico para este ativo." }
  }

  const company = await prisma.company.findUnique({
    where: { id: existing.companyId },
    select: { ticker: true, priceCents: true },
  })

  try {
    await prisma.priceAlert.update({
      where: { id },
      // Editing a condition re-arms it — a stale TRIGGERED/PAUSED alert
      // with a new target is meant to watch again, not stay dormant.
      data: { direction, targetPriceCents, status: "ACTIVE", triggeredAt: null, triggeredPriceCents: null },
    })
    if (company) {
      await AlertService.checkAlertsForTicker({
        ticker: company.ticker,
        companyId: existing.companyId,
        priceCents: company.priceCents,
      })
    }
  } catch {
    return { ok: false, error: "Não foi possível atualizar o alerta." }
  }

  revalidatePath("/alertas")
  return { ok: true }
}

async function setAlertStatus(
  id: string,
  status: "ACTIVE" | "PAUSED" | "CANCELED",
  resetTrigger: boolean,
  logLabel: "alerta pausado" | "alerta reativado" | "alerta excluído"
): Promise<AlertActionResult> {
  const profile = await requireUser()
  const result = await prisma.priceAlert.updateMany({
    where: { id, profileId: profile.id },
    data: resetTrigger
      ? { status, triggeredAt: null, triggeredPriceCents: null }
      : { status },
  })
  if (result.count === 0) return { ok: false, error: "Alerta não encontrado." }

  console.info(`[AlertService] ${logLabel} id=${id} profileId=${profile.id}`)
  revalidatePath("/alertas")
  return { ok: true }
}

export async function pauseAlertAction(id: string): Promise<AlertActionResult> {
  return setAlertStatus(id, "PAUSED", false, "alerta pausado")
}

export async function resumeAlertAction(id: string): Promise<AlertActionResult> {
  const profile = await requireUser()
  const alert = await prisma.priceAlert.findFirst({
    where: { id, profileId: profile.id },
    select: { companyId: true },
  })
  const result = await setAlertStatus(id, "ACTIVE", true, "alerta reativado")
  if (result.ok && alert) {
    const company = await prisma.company.findUnique({
      where: { id: alert.companyId },
      select: { ticker: true, priceCents: true },
    })
    if (company) {
      await AlertService.checkAlertsForTicker({
        ticker: company.ticker,
        companyId: alert.companyId,
        priceCents: company.priceCents,
      })
    }
  }
  return result
}

/// A soft delete — flips status to CANCELED (hidden from the list) rather
/// than deleting the row, since AlertNotification's alertId FK cascades on
/// PriceAlert delete and would otherwise wipe the user's notification
/// history for something they already got notified about.
export async function deleteAlertAction(id: string): Promise<AlertActionResult> {
  return setAlertStatus(id, "CANCELED", false, "alerta excluído")
}

export async function getUnreadNotificationCountAction(): Promise<number> {
  const profile = await requireUser()
  return getUnreadNotificationCount(profile.id)
}

export async function getRecentNotificationsAction(): Promise<AlertNotificationRow[]> {
  const profile = await requireUser()
  return getRecentNotificationsForProfile(profile.id)
}

export async function markNotificationsReadAction(): Promise<void> {
  const profile = await requireUser()
  await prisma.alertNotification.updateMany({
    where: { profileId: profile.id, status: "UNREAD" },
    data: { status: "READ" },
  })
}
