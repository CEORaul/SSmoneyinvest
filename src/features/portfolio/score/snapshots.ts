import "server-only"

import { prisma } from "@/lib/prisma"
import type { PortfolioScoreResult } from "@/features/portfolio/score/types"

export interface ScoreHistoryPoint {
  date: string
  score: number
}

/// Idempotent per (profileId, calendar day) — visiting /score more than
/// once on the same day never creates a duplicate point. The chart starts
/// with today's single point and gains one more each day the user (or a
/// future cron) triggers a recompute, exactly matching "mesmo que
/// inicialmente só exista um ponto" — there is deliberately no backfill
/// (see the PortfolioScoreSnapshot doc comment in schema.prisma for why a
/// historical score can't be honestly recomputed for past dates).
export async function recordScoreSnapshotIfNeeded(profileId: string, result: PortfolioScoreResult): Promise<void> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const existingToday = await prisma.portfolioScoreSnapshot.findFirst({
    where: { profileId, createdAt: { gte: startOfDay } },
    select: { id: true },
  })
  if (existingToday) return

  await prisma.portfolioScoreSnapshot.create({
    data: { profileId, score: result.score, breakdown: result.criteria as object },
  })
}

export async function getScoreHistory(profileId: string): Promise<ScoreHistoryPoint[]> {
  const rows = await prisma.portfolioScoreSnapshot.findMany({
    where: { profileId },
    orderBy: { createdAt: "asc" },
    select: { score: true, createdAt: true },
  })
  return rows.map((row) => ({ date: row.createdAt.toISOString().slice(0, 10), score: row.score }))
}
