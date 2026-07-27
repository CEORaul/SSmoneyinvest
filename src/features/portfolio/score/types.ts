export type ScoreBucket = "Excelente" | "Boa" | "Regular" | "Fraca" | "Muito Fraca"

export interface CriterionExplanation {
  whatItMeans: string
  howItsCalculated: string
  whyItMatters: string
}

/// One row of the transparent breakdown — `score: null` means this
/// criterion couldn't be computed for this portfolio (e.g. no position has
/// a known sector), and is excluded from the total rather than scored as
/// zero. Never a "magic number": `summary` always states the real figure
/// (a percentage, a count) that produced the score.
export interface CriterionResult {
  key: string
  label: string
  weight: number
  score: number | null
  summary: string
  explanation: CriterionExplanation
}

export interface PortfolioScoreResult {
  score: number
  bucket: ScoreBucket
  criteria: CriterionResult[]
  /// Sum of weights actually used in the denominator — equals 100 unless
  /// one or more criteria were inapplicable (score: null), in which case
  /// the total is renormalized over just the applicable weight so a
  /// portfolio that can't be scored on every axis is never unfairly
  /// dragged down by axes it has no data for.
  weightUsed: number
}
