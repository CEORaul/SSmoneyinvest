"use server"

import { getRadarSummaryForProfile } from "@/features/radar/summary"
import { requireUser } from "@/lib/auth/session"

export interface RadarSummaryResult {
  ok: boolean
  text?: string
  generatedAt?: string
}

/// Backs the "Gerar resumo inteligente" button (Radar do Dia) — re-derives
/// the profile server-side (never trusts a client-supplied id) then defers
/// to the shared fact-building/generation logic in radar/summary.ts, the
/// same code path RadarAiCard's "IA Financeira" card uses.
export async function requestRadarSummaryAction(): Promise<RadarSummaryResult> {
  const profile = await requireUser()
  const result = await getRadarSummaryForProfile(profile.id)
  return result ? { ok: true, text: result.text, generatedAt: result.generatedAt.toISOString() } : { ok: false }
}
