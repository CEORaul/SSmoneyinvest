import "server-only"

import { getPatrimonyHistory } from "@/features/portfolio/analytics"
import type { PortfolioTotals } from "@/features/portfolio/queries"

export interface BenchmarkRow {
  key: string
  label: string
  available: boolean
  cumulativeReturnPct: number | null
  annualReturnPct: number | null
  monthlyReturnPct: number | null
  unavailableReason?: string
}

/// Same convention as UnavailableFilterControl in the Mercado feature: when
/// there's no real data source, say so explicitly instead of guessing or
/// fabricating a number. No Ibovespa/IFIX/CDI/S&P500/Bitcoin index is
/// synced anywhere in this app today — a benchmark row only ever shows a
/// real number when it's backed by an actual Company with real synced
/// price history (see "Minha Carteira" below, computed from the user's own
/// real positions/transactions via getPatrimonyHistory — never BRAPI live).
const UNAVAILABLE_REASON = "Dado disponível quando a SSmoney sincronizar este índice/benchmark."

function computeReturnPct(points: { valueCents: number }[]): number | null {
  if (points.length < 2) return null
  const first = points[0].valueCents
  const last = points[points.length - 1].valueCents
  if (first <= 0) return null
  return ((last - first) / first) * 100
}

function unavailableBenchmark(key: string, label: string): BenchmarkRow {
  return {
    key,
    label,
    available: false,
    cumulativeReturnPct: null,
    annualReturnPct: null,
    monthlyReturnPct: null,
    unavailableReason: UNAVAILABLE_REASON,
  }
}

export async function getBenchmarkComparison(profileId: string, totals: PortfolioTotals): Promise<BenchmarkRow[]> {
  const [oneYear, oneMonth] = await Promise.all([
    getPatrimonyHistory(profileId, "1A"),
    getPatrimonyHistory(profileId, "1M"),
  ])

  const myPortfolio: BenchmarkRow = {
    key: "portfolio",
    label: "Minha Carteira",
    available: true,
    // Same figure already shown across the app (PortfolioSummaryCards,
    // Carteira insights) — never a second, possibly-diverging calculation.
    cumulativeReturnPct: totals.profitPct,
    annualReturnPct: computeReturnPct(oneYear),
    monthlyReturnPct: computeReturnPct(oneMonth),
  }

  return [
    myPortfolio,
    unavailableBenchmark("ibovespa", "Ibovespa"),
    unavailableBenchmark("ifix", "IFIX"),
    unavailableBenchmark("cdi", "CDI"),
    unavailableBenchmark("sp500", "S&P 500"),
    unavailableBenchmark("bitcoin", "Bitcoin"),
  ]
}
