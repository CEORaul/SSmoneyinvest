"use server"

import { revalidatePath } from "next/cache"

import { getWatchlistAnalysis } from "@/features/watchlist/analysis"
import {
  computeWatchlistStats,
  getWatchlistItems,
  getWatchlistOwnedByProfile,
  getWatchlistsForProfile,
} from "@/features/watchlist/queries"
import { addWatchlistItemSchema, createWatchlistSchema, updateWatchlistSchema } from "@/features/watchlist/schemas"
import type {
  WatchlistActionResult,
  WatchlistItemRow,
  WatchlistStats,
  WatchlistSummary,
} from "@/features/watchlist/types"
import { requireUser } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export async function getWatchlistsAction(): Promise<WatchlistSummary[]> {
  const profile = await requireUser()
  return getWatchlistsForProfile(profile.id)
}

export async function getWatchlistItemsAction(watchlistId: string): Promise<WatchlistItemRow[]> {
  const profile = await requireUser()
  return getWatchlistItems(watchlistId, profile.id)
}

export async function getWatchlistStatsAction(): Promise<WatchlistStats> {
  const profile = await requireUser()
  return computeWatchlistStats(profile.id)
}

export async function createWatchlistAction(input: {
  name: string
  description?: string
  icon?: string
  color?: string
}): Promise<WatchlistActionResult & { id?: string }> {
  const parsed = createWatchlistSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const profile = await requireUser()
  const { name, description, icon, color } = parsed.data

  const watchlist = await prisma.watchlist.create({
    data: { profileId: profile.id, name, description, icon, color },
  })

  revalidatePath("/watchlist")
  return { ok: true, id: watchlist.id }
}

export async function updateWatchlistAction(input: {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
}): Promise<WatchlistActionResult> {
  const parsed = updateWatchlistSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const profile = await requireUser()
  const { id, name, description, icon, color } = parsed.data

  const result = await prisma.watchlist.updateMany({
    where: { id, profileId: profile.id },
    data: { name, description, icon, color },
  })
  if (result.count === 0) return { ok: false, error: "Lista não encontrada." }

  revalidatePath("/watchlist")
  return { ok: true }
}

export async function deleteWatchlistAction(id: string): Promise<WatchlistActionResult> {
  const profile = await requireUser()
  const result = await prisma.watchlist.deleteMany({ where: { id, profileId: profile.id } })
  if (result.count === 0) return { ok: false, error: "Lista não encontrada." }

  revalidatePath("/watchlist")
  return { ok: true }
}

export async function addWatchlistItemAction(input: {
  watchlistId: string
  companyId: string
}): Promise<WatchlistActionResult> {
  const parsed = addWatchlistItemSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const profile = await requireUser()
  const { watchlistId, companyId } = parsed.data

  const watchlist = await getWatchlistOwnedByProfile(watchlistId, profile.id)
  if (!watchlist) return { ok: false, error: "Lista não encontrada." }

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } })
  if (!company) return { ok: false, error: "Ativo não encontrado." }

  try {
    await prisma.watchlistItem.create({ data: { watchlistId, companyId } })
  } catch {
    return { ok: false, error: "Esse ativo já está nesta lista." }
  }

  revalidatePath("/watchlist")
  return { ok: true }
}

export async function removeWatchlistItemAction(itemId: string): Promise<WatchlistActionResult> {
  const profile = await requireUser()
  const result = await prisma.watchlistItem.deleteMany({
    where: { id: itemId, watchlist: { profileId: profile.id } },
  })
  if (result.count === 0) return { ok: false, error: "Item não encontrado." }

  revalidatePath("/watchlist")
  return { ok: true }
}

export async function requestWatchlistAnalysisAction(
  watchlistId: string
): Promise<{ ok: boolean; text?: string; generatedAt?: string; error?: string }> {
  const profile = await requireUser()

  const watchlist = await getWatchlistOwnedByProfile(watchlistId, profile.id)
  if (!watchlist) return { ok: false, error: "Lista não encontrada." }

  const result = await getWatchlistAnalysis(watchlistId, profile.id)
  if (!result) return { ok: false, error: "Não há dados suficientes nesta lista para gerar uma análise." }

  return { ok: true, text: result.text, generatedAt: result.generatedAt.toISOString() }
}
