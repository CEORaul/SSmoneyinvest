import { translateSector } from "@/features/company/sector-labels"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import type { PortfolioPositionRow, PortfolioTotals } from "@/features/portfolio/queries"

/// Pure functions over already-fetched PortfolioPositionRow[] — no Prisma
/// access, no re-derivation of any figure getPortfolioSummary already
/// computed. Everything here just picks/aggregates rows that are already
/// real numbers.

export interface TopMover {
  position: PortfolioPositionRow
  value: number
}

export interface TopMovers {
  biggestGainer: TopMover | null
  biggestLoser: TopMover | null
  largestPosition: TopMover | null
  biggestProfit: TopMover | null
  biggestLoss: TopMover | null
}

/// "Maior alta/queda do dia", "maior posição", "maior lucro/prejuízo" —
/// each just picks the extremal row by an already-computed field. Returns
/// null for any card when there's nothing to show (e.g. every position
/// is currently profitable, so there's no "maior prejuízo") rather than
/// picking an arbitrary row and mislabeling it.
export function computeTopMovers(positions: PortfolioPositionRow[]): TopMovers {
  if (positions.length === 0) {
    return { biggestGainer: null, biggestLoser: null, largestPosition: null, biggestProfit: null, biggestLoss: null }
  }

  const gainers = positions.filter((p) => p.priceChangePct > 0)
  const losers = positions.filter((p) => p.priceChangePct < 0)
  const profitable = positions.filter((p) => p.profitCents > 0)
  const unprofitable = positions.filter((p) => p.profitCents < 0)

  const maxBy = (rows: PortfolioPositionRow[], selector: (row: PortfolioPositionRow) => number): TopMover | null => {
    if (rows.length === 0) return null
    const best = rows.reduce((a, b) => (selector(b) > selector(a) ? b : a))
    return { position: best, value: selector(best) }
  }
  const minBy = (rows: PortfolioPositionRow[], selector: (row: PortfolioPositionRow) => number): TopMover | null => {
    if (rows.length === 0) return null
    const worst = rows.reduce((a, b) => (selector(b) < selector(a) ? b : a))
    return { position: worst, value: selector(worst) }
  }

  return {
    biggestGainer: maxBy(gainers, (p) => p.priceChangePct),
    biggestLoser: minBy(losers, (p) => p.priceChangePct),
    largestPosition: maxBy(positions, (p) => p.currentValueCents),
    biggestProfit: maxBy(profitable, (p) => p.profitCents),
    biggestLoss: minBy(unprofitable, (p) => p.profitCents),
  }
}

export interface PortfolioInsight {
  key: string
  text: string
  href?: string
}

/// Rule-based (not AI) — every sentence here is a template filled with a
/// real, already-computed number. Deliberately structured as a flat list
/// of {key, text, href} so a future AI-phrased version can slot in by
/// replacing how `text` is built, without touching what triggers each
/// insight or how the page renders the list.
export function computePortfolioInsights(
  positions: PortfolioPositionRow[],
  totals: PortfolioTotals,
  dividendsReceivedThisMonthCents: number
): PortfolioInsight[] {
  const insights: PortfolioInsight[] = []
  if (positions.length === 0) return insights

  const largest = positions.reduce((a, b) => (b.currentValueCents > a.currentValueCents ? b : a))
  insights.push({
    key: "largest-position",
    text: `Sua maior posição é ${largest.ticker}, representando ${largest.allocationPct.toFixed(1).replace(".", ",")}% da carteira.`,
    href: `/empresa/${largest.ticker}`,
  })

  if (dividendsReceivedThisMonthCents > 0) {
    insights.push({
      key: "dividends-this-month",
      text: `Você recebeu ${(dividendsReceivedThisMonthCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de dividendos este mês.`,
    })
  }

  insights.push({
    key: "portfolio-return",
    text:
      totals.profitPct >= 0
        ? `Sua carteira valorizou ${totals.profitPct.toFixed(1).replace(".", ",")}% desde o início.`
        : `Sua carteira está ${Math.abs(totals.profitPct).toFixed(1).replace(".", ",")}% abaixo do valor investido.`,
  })

  const profitable = positions.filter((p) => p.profitPct > 0)
  if (profitable.length > 0) {
    const best = profitable.reduce((a, b) => (b.profitPct > a.profitPct ? b : a))
    insights.push({
      key: "most-profitable",
      text: `Seu ativo mais rentável é ${best.ticker}, com ${best.profitPct.toFixed(1).replace(".", ",")}% de valorização.`,
      href: `/empresa/${best.ticker}`,
    })
  }

  const unprofitable = positions.filter((p) => p.profitPct < 0)
  if (unprofitable.length > 0) {
    const worst = unprofitable.reduce((a, b) => (b.profitPct < a.profitPct ? b : a))
    insights.push({
      key: "least-profitable",
      text: `Seu ativo com maior prejuízo é ${worst.ticker}, com ${worst.profitPct.toFixed(1).replace(".", ",")}% de queda.`,
      href: `/empresa/${worst.ticker}`,
    })
  }

  return insights
}

export interface AllocationSlice {
  label: string
  valueCents: number
  pct: number
}

/// "Distribuição por categoria" pie — reuses the exact same category
/// grouping getPortfolioSummary already did, just reshaped for a chart.
export function computeCategoryAllocation(
  byCategory: { category: string; totals: { currentValueCents: number; allocationPct: number } }[]
): AllocationSlice[] {
  return byCategory.map((group) => ({
    label: getAssetCategoryMeta(group.category as Parameters<typeof getAssetCategoryMeta>[0]).label,
    valueCents: group.totals.currentValueCents,
    pct: group.totals.allocationPct,
  }))
}

/// "Distribuição por setor" pie — sector is only meaningful for STOCK/BDR
/// today (see asset-category's hasFundamentals); positions with no sector
/// (FIIs, ETFs, Cripto, manual entries) are grouped under "Outros" rather
/// than silently dropped, so the pie's total still matches the portfolio.
export function computeSectorAllocation(positions: PortfolioPositionRow[]): AllocationSlice[] {
  const bySector = new Map<string, number>()
  const totalValueCents = positions.reduce((sum, p) => sum + p.currentValueCents, 0)

  for (const position of positions) {
    const key = position.sector ?? "Outros"
    bySector.set(key, (bySector.get(key) ?? 0) + position.currentValueCents)
  }

  return [...bySector.entries()]
    .map(([label, valueCents]) => ({
      label: translateSector(label),
      valueCents,
      pct: totalValueCents > 0 ? (valueCents / totalValueCents) * 100 : 0,
    }))
    .sort((a, b) => b.valueCents - a.valueCents)
}

/// "Distribuição por ativo" pie — every position, largest first; the
/// caller decides how many top slices to show directly vs. folding the
/// rest into "Outros" (never this module's job — it just reports every
/// slice, largest first).
export function computeAssetAllocation(positions: PortfolioPositionRow[]): AllocationSlice[] {
  return [...positions]
    .sort((a, b) => b.currentValueCents - a.currentValueCents)
    .map((position) => ({
      label: position.ticker,
      valueCents: position.currentValueCents,
      pct: position.allocationPct,
    }))
}
