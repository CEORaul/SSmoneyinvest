import type { Decimal } from "@prisma/client/runtime/client"

export interface PositionMetricsInput {
  quantity: Decimal
  priceCents: number
  totalInvestedCents: bigint
}

export interface PositionMetrics {
  currentValueCents: number
  investedCents: number
  profitCents: number
  profitPct: number
}

/// Pure math shared by getPortfolioSummary (every position) and
/// getUserPositionSummary (one position, for /empresa/[ticker]) — kept in
/// one place so the two call sites can never quietly drift apart.
export function computePositionMetrics(input: PositionMetricsInput): PositionMetrics {
  const currentValueCents = input.quantity.mul(input.priceCents).round().toNumber()
  const investedCents = Number(input.totalInvestedCents)
  const profitCents = currentValueCents - investedCents
  const profitPct = investedCents > 0 ? (profitCents / investedCents) * 100 : 0

  return { currentValueCents, investedCents, profitCents, profitPct }
}
