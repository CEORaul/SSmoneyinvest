import type { PortfolioSummary } from "@/features/portfolio/queries"
import { SCORE_CRITERIA } from "@/features/portfolio/score/criteria"
import type { CriterionResult, PortfolioScoreResult, ScoreBucket } from "@/features/portfolio/score/types"

function bucketFor(score: number): ScoreBucket {
  if (score >= 80) return "Excelente"
  if (score >= 65) return "Boa"
  if (score >= 45) return "Regular"
  if (score >= 25) return "Fraca"
  return "Muito Fraca"
}

/// The whole Score Inteligente in one deterministic pass: every criterion in
/// SCORE_CRITERIA runs against the same PortfolioSummary already used
/// throughout /carteira (never a second query, never live BRAPI). Criteria
/// that return `score: null` (inapplicable — e.g. no position has a known
/// sector) are excluded from BOTH the numerator and denominator, so the
/// total is renormalized over whatever weight actually applied rather than
/// silently scored as zero — this is what "nunca gerar uma nota mágica"
/// means in practice: every point is traceable to a real, shown criterion.
///
/// Returns null when the portfolio has no positions — never a fake score
/// for an empty carteira; the page shows an empty state instead.
export function computePortfolioScore(summary: PortfolioSummary): PortfolioScoreResult | null {
  if (summary.positions.length === 0) return null

  const criteria: CriterionResult[] = SCORE_CRITERIA.map((def) => {
    const result = def.compute(summary)
    return { key: def.key, label: def.label, weight: def.weight, ...result }
  })

  const applicable = criteria.filter((c) => c.score != null)
  const weightUsed = applicable.reduce((sum, c) => sum + c.weight, 0)
  const pointsEarned = applicable.reduce((sum, c) => sum + (c.score ?? 0), 0)
  const score = weightUsed > 0 ? Math.round((pointsEarned / weightUsed) * 100) : 0

  return { score, bucket: bucketFor(score), criteria, weightUsed }
}
