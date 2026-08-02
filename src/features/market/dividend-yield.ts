import "server-only"

import { prisma } from "@/lib/prisma"

export const TRAILING_DIVIDEND_WINDOW_DAYS = 365

function windowStart(): Date {
  return new Date(Date.now() - TRAILING_DIVIDEND_WINDOW_DAYS * 24 * 60 * 60 * 1000)
}

/// Sum of DividendPayment.amountPerShare over the trailing 365 days, per
/// company, in one query (avoids N+1 when rendering a table of positions) —
/// the shared building block behind both getTrailingDividendYieldMap
/// (÷ current price) and Carteira's Yield on Cost (÷ average purchase
/// price), so the two never drift into separately-computed real numbers.
export async function getTrailingDividendPerShareMap(companyIds: string[]): Promise<Map<string, number>> {
  if (companyIds.length === 0) return new Map()

  const grouped = await prisma.dividendPayment.groupBy({
    by: ["companyId"],
    where: { companyId: { in: companyIds }, exDate: { gte: windowStart() } },
    _sum: { amountPerShare: true },
  })

  return new Map(grouped.map((row) => [row.companyId, Number(row._sum.amountPerShare ?? 0)]))
}

/// Trailing-12-month dividend yield for a batch of companies — computed from
/// real DividendPayment rows, 0 for any company with no payment in the
/// window or no current price.
export async function getTrailingDividendYieldMap(
  companies: { id: string; priceCents: number }[]
): Promise<Map<string, number>> {
  if (companies.length === 0) return new Map()

  const totalPerShareByCompanyId = await getTrailingDividendPerShareMap(companies.map((c) => c.id))
  const priceCentsByCompanyId = new Map(companies.map((c) => [c.id, c.priceCents]))

  const yields = new Map<string, number>()
  for (const [companyId, totalPerShare] of totalPerShareByCompanyId) {
    const priceCents = priceCentsByCompanyId.get(companyId) ?? 0
    yields.set(companyId, priceCents > 0 ? (totalPerShare / (priceCents / 100)) * 100 : 0)
  }
  return yields
}

/// Yield on Cost: the same trailing-12-month dividends-per-share, but
/// divided by the position's average purchase price instead of the current
/// market price — how much of what was actually paid for the shares comes
/// back as dividends each year, a different (usually higher, for an old
/// winning position) number from the regular yield above.
export function computeYieldOnCost(trailingDividendPerShare: number, averagePriceCents: number): number {
  if (averagePriceCents <= 0) return 0
  return (trailingDividendPerShare / (averagePriceCents / 100)) * 100
}

export interface AnnualDividendPerShare {
  year: number
  totalPerShare: number
}

/// Groups the full DividendPayment history by calendar year of exDate — a
/// different shape from getTrailingDividendYieldMap's fixed 365-day window
/// above, purpose-built for a multi-year "Dividendos" line in Histórico.
export async function getAnnualDividendPerShareSeries(companyId: string): Promise<AnnualDividendPerShare[]> {
  const payments = await prisma.dividendPayment.findMany({
    where: { companyId },
    select: { exDate: true, amountPerShare: true },
    orderBy: { exDate: "asc" },
  })

  const totalByYear = new Map<number, number>()
  for (const payment of payments) {
    const year = payment.exDate.getUTCFullYear()
    totalByYear.set(year, (totalByYear.get(year) ?? 0) + Number(payment.amountPerShare))
  }

  return [...totalByYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, totalPerShare]) => ({ year, totalPerShare }))
}
