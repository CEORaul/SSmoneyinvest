"use server"

import { getPatrimonyHistory, type PatrimonyPeriod, type PatrimonyPoint } from "@/features/portfolio/analytics"
import { requireUser } from "@/lib/auth/session"

/// Backs the "Evolução da carteira" period selector — each switch re-runs
/// the transaction-replay computation for the newly requested window (see
/// analytics.ts's getPatrimonyHistory doc comment for why this can't be
/// derived client-side from data already on the page).
export async function getPatrimonyHistoryAction(period: PatrimonyPeriod): Promise<PatrimonyPoint[]> {
  const profile = await requireUser()
  return getPatrimonyHistory(profile.id, period)
}
