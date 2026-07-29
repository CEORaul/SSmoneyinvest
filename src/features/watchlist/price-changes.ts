import "server-only"

import { getPriceHistoryForCompanies } from "@/features/comparator/queries"

const DAY_MS = 24 * 60 * 60 * 1000

export interface CompanyChanges {
  weeklyChangePct: number | null
  monthlyChangePct: number | null
}

/// Weekly/monthly change for a batch of companies, reusing the same batched
/// "1M" price history the comparator's chart already fetches — never a
/// per-company round trip. A ticker synced at a coarser-than-daily cadence
/// may not have a point exactly 7 or 30 days old, so this picks the closest
/// available point at-or-before the target date instead of assuming an exact
/// match; a company with less than a week/month of history gets null
/// (rendered as "—"), never a fabricated 0%.
export async function computeWeeklyMonthlyChanges(
  companies: { id: string; priceCents: number }[]
): Promise<Map<string, CompanyChanges>> {
  const result = new Map<string, CompanyChanges>()
  if (companies.length === 0) return result

  const companyIds = companies.map((c) => c.id)
  const historyByCompany = await getPriceHistoryForCompanies(companyIds, "1M")
  const now = Date.now()
  const weekAgo = now - 7 * DAY_MS

  for (const company of companies) {
    const points = historyByCompany.get(company.id) ?? []
    result.set(company.id, {
      weeklyChangePct: computeChangeAgainstClosestBefore(points, weekAgo, company.priceCents),
      monthlyChangePct: points.length > 0 ? computeChangePct(company.priceCents, points[0].closeCents) : null,
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
