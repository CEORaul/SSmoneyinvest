import "server-only"

import { getPriceHistoryForCompanies } from "@/features/comparator/queries"
import type { NewsPerformanceSnapshot } from "@/features/news/types"

const DAY_MS = 24 * 60 * 60 * 1000

interface CompanyForPerformance {
  id: string
  priceCents: number
  priceChangePct: number
}

/// "Desempenho do ativo" (hoje/7d/30d/52 sem) for a batch of companies —
/// "hoje" is just Company.priceChangePct (already computed everywhere
/// else); the rest come from ONE batched "1A" price-history call (the same
/// comparator query the chart on /empresa and /comparar already uses), not
/// a new calculation per company. A ticker synced at a coarser-than-daily
/// cadence may not have a point exactly N days old, so this picks the
/// closest available point at-or-before the target date — same algorithm
/// already used elsewhere in this app for weekly/monthly deltas. Less than
/// a target's worth of history yields null (rendered as "—"), never a
/// fabricated 0%.
export async function computePerformanceSnapshots(
  companies: CompanyForPerformance[]
): Promise<Map<string, NewsPerformanceSnapshot>> {
  const result = new Map<string, NewsPerformanceSnapshot>()
  if (companies.length === 0) return result

  const companyIds = companies.map((c) => c.id)
  const historyByCompany = await getPriceHistoryForCompanies(companyIds, "1A")
  const now = Date.now()
  const sevenDayTarget = now - 7 * DAY_MS
  const thirtyDayTarget = now - 30 * DAY_MS
  const fiftyTwoWeekTarget = now - 365 * DAY_MS

  for (const company of companies) {
    const points = historyByCompany.get(company.id) ?? []
    result.set(company.id, {
      todayPct: company.priceChangePct,
      sevenDayPct: computeChangeAgainstClosestBefore(points, sevenDayTarget, company.priceCents),
      thirtyDayPct: computeChangeAgainstClosestBefore(points, thirtyDayTarget, company.priceCents),
      fiftyTwoWeekPct: computeChangeAgainstClosestBefore(points, fiftyTwoWeekTarget, company.priceCents),
    })
  }

  return result
}

function computeChangeAgainstClosestBefore(
  points: { date: Date; closeCents: number }[],
  targetMs: number,
  currentPriceCents: number
): number | null {
  let closest: { date: Date; closeCents: number } | null = null
  for (const point of points) {
    if (point.date.getTime() > targetMs) continue
    if (!closest || point.date.getTime() > closest.date.getTime()) closest = point
  }
  if (!closest) return null
  return computeChangePct(currentPriceCents, closest.closeCents)
}

function computeChangePct(currentCents: number, pastCents: number): number | null {
  if (pastCents <= 0) return null
  return ((currentCents - pastCents) / pastCents) * 100
}
