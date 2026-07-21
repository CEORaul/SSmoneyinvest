"use server"

import { revalidatePath } from "next/cache"

import { getPriceHistoryForRange, type ChartPeriod } from "@/features/company/queries"
import { requireUser } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export interface PricePointRow {
  date: string
  closeCents: number
  volume: string | null
}

/// Server Action, not a route handler — FinancialChart calls this on every
/// period-tab switch. Only PriceHistoryPoint reads, same as every other
/// price-history query in the app; never touches the market-data provider.
export async function getPriceHistoryAction(
  companyId: string,
  period: ChartPeriod
): Promise<PricePointRow[]> {
  const points = await getPriceHistoryForRange(companyId, period)
  return points.map((point) => ({
    date: point.date.toISOString(),
    closeCents: point.closeCents,
    volume: point.volume != null ? point.volume.toString() : null,
  }))
}

export interface ActionResult {
  ok: boolean
  error?: string
  favorited?: boolean
}

/// Toggle rather than separate add/remove — the FavoriteButton only ever
/// needs "flip the current state", and the unique (profileId, companyId)
/// constraint on Favorite means there's nothing to reconcile beyond
/// find-then-create-or-delete.
export async function toggleFavoriteAction(companyId: string, ticker: string): Promise<ActionResult> {
  const profile = await requireUser()

  try {
    const existing = await prisma.favorite.findUnique({
      where: { profileId_companyId: { profileId: profile.id, companyId } },
    })

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } })
      revalidatePath(`/empresa/${ticker}`)
      revalidatePath("/favoritos")
      return { ok: true, favorited: false }
    }

    await prisma.favorite.create({ data: { profileId: profile.id, companyId } })
    revalidatePath(`/empresa/${ticker}`)
    revalidatePath("/favoritos")
    return { ok: true, favorited: true }
  } catch {
    return { ok: false, error: "Não foi possível atualizar os favoritos." }
  }
}
