"use server"

import { revalidatePath } from "next/cache"

import { getHistoricalMetricSeries } from "@/features/company/historico/queries"
import type { HistoricoMetric, HistoricoSeries } from "@/features/company/historico/types"
import { getPriceHistoryForRange, type ChartPeriod } from "@/features/company/queries"
import { getStatementPeriods } from "@/features/company/statements/queries"
import type { StatementPeriodMode, StatementPeriodRow, StatementType } from "@/features/company/statements/types"
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

/// Lazy Server Action, not preloaded on page load — mirrors
/// getPriceHistoryAction's shape. DemonstrativosSection calls this on
/// every statement-type/period tab switch, since a user may never open
/// the section at all.
export async function getStatementsAction(
  companyId: string,
  type: StatementType,
  period: StatementPeriodMode
): Promise<StatementPeriodRow[]> {
  const rows = await getStatementPeriods(companyId, type, period)
  return rows.map((row) => ({ endDate: row.endDate.toISOString(), values: row.values }))
}

/// Lazy Server Action, same shape as getStatementsAction — HistoricoSection
/// calls this on every metric-tab switch.
export async function getHistoricalMetricAction(companyId: string, metric: HistoricoMetric): Promise<HistoricoSeries[]> {
  return getHistoricalMetricSeries(companyId, metric)
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
