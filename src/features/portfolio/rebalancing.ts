import "server-only"

import type { AssetClass } from "@/generated/prisma/client"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import type { PortfolioCategoryGroup } from "@/features/portfolio/queries"
import { prisma } from "@/lib/prisma"

/// Read-only comparison logic over the user's own configured targets — never
/// touches PortfolioPosition/Transaction or portfolio-service.ts. Absence of
/// a TargetAllocation row for a category means "no target set," rendered as
/// "sem-alvo," never assumed to be a target of 0%.

export async function getTargetAllocations(profileId: string): Promise<Map<AssetClass, number>> {
  const rows = await prisma.targetAllocation.findMany({ where: { profileId } })
  return new Map(rows.map((row) => [row.assetClass, Number(row.targetPct)]))
}

export interface RebalancingRow {
  category: AssetClass
  label: string
  currentPct: number
  targetPct: number | null
  /// currentPct - targetPct: positive = acima do objetivo, negative = abaixo.
  diffPct: number | null
  /// R$ that would need to move into (positive) or out of (negative) this
  /// category to hit the target, given the portfolio's current total value.
  amountToMoveCents: number | null
  status: "acima" | "abaixo" | "no-alvo" | "sem-alvo"
}

// Within 1 percentage point of the target counts as "on target" — real
// portfolios drift by fractions of a point on every price tick, so a hard
// equality check would never show "no-alvo" for anyone.
const REBALANCE_TOLERANCE_PCT = 1

function buildRow(
  category: AssetClass,
  currentPct: number,
  targetPct: number | null,
  portfolioCurrentValueCents: number
): RebalancingRow {
  const label = getAssetCategoryMeta(category).label
  if (targetPct == null) {
    return { category, label, currentPct, targetPct: null, diffPct: null, amountToMoveCents: null, status: "sem-alvo" }
  }

  const diffPct = currentPct - targetPct
  const amountToMoveCents = Math.round(((targetPct - currentPct) / 100) * portfolioCurrentValueCents)
  const status: RebalancingRow["status"] =
    Math.abs(diffPct) <= REBALANCE_TOLERANCE_PCT ? "no-alvo" : diffPct > 0 ? "acima" : "abaixo"

  return { category, label, currentPct, targetPct, diffPct, amountToMoveCents, status }
}

/// One row per category the user either holds or has set a target for —
/// a target with zero current holdings still surfaces (e.g. "faltam R$ 500
/// em FIIs" for a category the user wants exposure to but hasn't bought
/// into yet), which is the entire point of the feature.
export function computeRebalancing(
  byCategory: PortfolioCategoryGroup[],
  targets: Map<AssetClass, number>,
  portfolioCurrentValueCents: number
): RebalancingRow[] {
  const rows: RebalancingRow[] = []
  const seen = new Set<AssetClass>()

  for (const group of byCategory) {
    seen.add(group.category)
    rows.push(buildRow(group.category, group.totals.allocationPct, targets.get(group.category) ?? null, portfolioCurrentValueCents))
  }
  for (const [category, targetPct] of targets) {
    if (seen.has(category)) continue
    rows.push(buildRow(category, 0, targetPct, portfolioCurrentValueCents))
  }

  return rows.sort((a, b) => getAssetCategoryMeta(a.category).order - getAssetCategoryMeta(b.category).order)
}
