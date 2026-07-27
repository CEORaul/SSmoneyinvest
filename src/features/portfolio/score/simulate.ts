import type { AssetClass, PriceSource } from "@/generated/prisma/client"
import type {
  PortfolioCategoryGroup,
  PortfolioPositionRow,
  PortfolioSummary,
  PortfolioTotals,
} from "@/features/portfolio/queries"

export type SimulatedChange =
  | {
      type: "ADD"
      companyId: string
      ticker: string
      name: string
      logoUrl: string | null
      sector: string | null
      assetClass: AssetClass
      priceSource: PriceSource
      priceCents: number
      valueCents: number
    }
  | { type: "REMOVE"; companyId: string }
  | { type: "ADJUST"; companyId: string; newValueCents: number }

/// A pure, in-memory "what-if" recompute — never touches the database or the
/// user's real positions/transactions. Given the current PortfolioSummary
/// and a list of hypothetical changes, returns a new PortfolioSummary-shaped
/// object with allocationPct/totals/byCategory recomputed the same way
/// getPortfolioSummary does, so computePortfolioScore can run on the result
/// unmodified — the simulator and the real score share one scoring engine,
/// they can never drift apart into two different definitions of "score."
export function applySimulatedChanges(summary: PortfolioSummary, changes: SimulatedChange[]): PortfolioSummary {
  let positions: PortfolioPositionRow[] = summary.positions.map((p) => ({ ...p }))

  for (const change of changes) {
    if (change.type === "REMOVE") {
      positions = positions.filter((p) => p.companyId !== change.companyId)
      continue
    }

    if (change.type === "ADJUST") {
      positions = positions.map((p) => (p.companyId === change.companyId ? { ...p, currentValueCents: change.newValueCents } : p))
      continue
    }

    // ADD — if the ticker is already held, top up its value; otherwise
    // insert a new hypothetical position built from what the search
    // combobox already returned (real ticker/sector/assetClass, never a
    // fabricated one).
    const existing = positions.find((p) => p.companyId === change.companyId)
    if (existing) {
      positions = positions.map((p) =>
        p.companyId === change.companyId ? { ...p, currentValueCents: p.currentValueCents + change.valueCents } : p
      )
    } else {
      positions = [
        ...positions,
        {
          id: `simulated-${change.companyId}`,
          companyId: change.companyId,
          ticker: change.ticker,
          name: change.name,
          logoUrl: change.logoUrl,
          sector: change.sector,
          assetClass: change.assetClass,
          priceSource: change.priceSource,
          quantity: change.priceCents > 0 ? String(change.valueCents / change.priceCents) : "0",
          averagePriceCents: change.priceCents,
          currentPriceCents: change.priceCents,
          priceChangePct: 0,
          investedCents: change.valueCents,
          currentValueCents: change.valueCents,
          profitCents: 0,
          profitPct: 0,
          dividendYieldPct: 0,
          dividendsReceivedCents: 0,
          allocationPct: 0, // recomputed in rebuildSummary below
          lastUpdatedAt: new Date(),
        },
      ]
    }
  }

  return rebuildSummary(positions)
}

/// Recomputes totals/allocationPct/byCategory from a position list, exactly
/// like getPortfolioSummary's internal grouping — duplicated here (rather
/// than imported) because that grouping helper isn't exported and this
/// module must stay a pure function with zero Prisma access. Fields the
/// score engine never reads (dailyChangePct, avgDividendYieldPct,
/// avgPurchasePriceCents) are left at 0 — honest placeholders, not values
/// any UI here displays.
function rebuildSummary(positions: PortfolioPositionRow[]): PortfolioSummary {
  const totalCurrentValueCents = positions.reduce((sum, p) => sum + p.currentValueCents, 0)
  const totalInvestedCents = positions.reduce((sum, p) => sum + p.investedCents, 0)

  const withAllocation = positions.map((p) => ({
    ...p,
    allocationPct: totalCurrentValueCents > 0 ? (p.currentValueCents / totalCurrentValueCents) * 100 : 0,
  }))

  const totals: PortfolioTotals = {
    investedCents: totalInvestedCents,
    currentValueCents: totalCurrentValueCents,
    profitCents: totalCurrentValueCents - totalInvestedCents,
    profitPct: totalInvestedCents > 0 ? ((totalCurrentValueCents - totalInvestedCents) / totalInvestedCents) * 100 : 0,
    dividendsReceivedCents: positions.reduce((sum, p) => sum + p.dividendsReceivedCents, 0),
    assetCount: positions.length,
  }

  const byCategoryMap = new Map<AssetClass, PortfolioPositionRow[]>()
  for (const p of withAllocation) {
    const list = byCategoryMap.get(p.assetClass) ?? []
    list.push(p)
    byCategoryMap.set(p.assetClass, list)
  }

  const byCategory: PortfolioCategoryGroup[] = [...byCategoryMap.entries()].map(([category, catPositions]) => {
    const catCurrentValueCents = catPositions.reduce((sum, p) => sum + p.currentValueCents, 0)
    const catInvestedCents = catPositions.reduce((sum, p) => sum + p.investedCents, 0)
    return {
      category,
      positions: catPositions,
      totals: {
        investedCents: catInvestedCents,
        currentValueCents: catCurrentValueCents,
        profitCents: catCurrentValueCents - catInvestedCents,
        profitPct: catInvestedCents > 0 ? ((catCurrentValueCents - catInvestedCents) / catInvestedCents) * 100 : 0,
        dividendsReceivedCents: catPositions.reduce((sum, p) => sum + p.dividendsReceivedCents, 0),
        assetCount: catPositions.length,
        dailyChangePct: 0,
        allocationPct: totalCurrentValueCents > 0 ? (catCurrentValueCents / totalCurrentValueCents) * 100 : 0,
        avgDividendYieldPct: 0,
        avgPurchasePriceCents: 0,
      },
    }
  })

  return { positions: withAllocation, totals, byCategory }
}
