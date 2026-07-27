import "server-only"

import { computePortfolioScore } from "@/features/portfolio/score/compute-score"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { aiContentService } from "@/services/ai-content-service"

/// Shared by both /score AI slots (short summary + structured analysis) —
/// mirrors src/features/radar/summary.ts's split: builds the fact list from
/// an already-computed PortfolioScoreResult, the service itself never
/// touches the portfolio. Each call independently recomputes the score (a
/// second getPortfolioSummary read) so both AI calls can stream in via
/// their own Suspense boundaries without blocking the rest of the page or
/// each other — same trade-off the Radar card already accepted.
async function buildScoreFacts(profileId: string): Promise<string[] | null> {
  const summary = await getPortfolioSummary(profileId)
  const result = computePortfolioScore(summary)
  if (!result) return null

  return [
    `Score geral: ${result.score}/100 (${result.bucket})`,
    ...result.criteria.map((criterion) =>
      criterion.score != null
        ? `${criterion.label}: ${criterion.score}/${criterion.weight} pontos — ${criterion.summary}`
        : `${criterion.label}: não aplicável — ${criterion.summary}`
    ),
  ]
}

export async function getScoreSummaryForProfile(
  profileId: string
): Promise<{ text: string; generatedAt: Date } | null> {
  const facts = await buildScoreFacts(profileId)
  if (!facts) return null
  return aiContentService.getOrGenerateScoreSummary(profileId, facts)
}

export async function getScoreAnalysisForProfile(
  profileId: string
): Promise<{ text: string; generatedAt: Date } | null> {
  const facts = await buildScoreFacts(profileId)
  if (!facts) return null
  return aiContentService.getOrGenerateScoreAnalysis(profileId, facts)
}
