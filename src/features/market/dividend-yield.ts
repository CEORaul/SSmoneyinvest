import "server-only"

import { prisma } from "@/lib/prisma"

export const TRAILING_DIVIDEND_WINDOW_DAYS = 365

function windowStart(): Date {
  return new Date(Date.now() - TRAILING_DIVIDEND_WINDOW_DAYS * 24 * 60 * 60 * 1000)
}

/// Trailing-12-month dividend yield for a batch of companies in one query
/// (avoids N+1 when rendering a table of positions) — computed from real
/// DividendPayment rows, 0 for any company with no payment in the window.
export async function getTrailingDividendYieldMap(
  companies: { id: string; priceCents: number }[]
): Promise<Map<string, number>> {
  if (companies.length === 0) return new Map()

  const grouped = await prisma.dividendPayment.groupBy({
    by: ["companyId"],
    where: { companyId: { in: companies.map((c) => c.id) }, exDate: { gte: windowStart() } },
    _sum: { amountPerShare: true },
  })

  const totalPerShareByCompanyId = new Map(
    grouped.map((row) => [row.companyId, Number(row._sum.amountPerShare ?? 0)])
  )
  const priceCentsByCompanyId = new Map(companies.map((c) => [c.id, c.priceCents]))

  const yields = new Map<string, number>()
  for (const [companyId, totalPerShare] of totalPerShareByCompanyId) {
    const priceCents = priceCentsByCompanyId.get(companyId) ?? 0
    yields.set(companyId, priceCents > 0 ? (totalPerShare / (priceCents / 100)) * 100 : 0)
  }
  return yields
}
