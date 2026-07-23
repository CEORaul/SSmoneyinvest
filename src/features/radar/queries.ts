import "server-only"

import { prisma } from "@/lib/prisma"

/// Backs "Oportunidades" (point 9) — day/52-week range is populated by the
/// existing detail sync (see market-data-service.ts, Company.
/// fiftyTwoWeekHighCents/LowCents), just not read anywhere yet. A company
/// that hasn't had a detail sync simply has null here, which the caller
/// treats as "no fact to show," never a fabricated range.
export async function getFiftyTwoWeekRangeForCompanies(
  companyIds: string[]
): Promise<Map<string, { highCents: number | null; lowCents: number | null }>> {
  const result = new Map<string, { highCents: number | null; lowCents: number | null }>()
  if (companyIds.length === 0) return result

  const rows = await prisma.company.findMany({
    where: { id: { in: companyIds } },
    select: { id: true, fiftyTwoWeekHighCents: true, fiftyTwoWeekLowCents: true },
  })

  for (const row of rows) {
    result.set(row.id, { highCents: row.fiftyTwoWeekHighCents, lowCents: row.fiftyTwoWeekLowCents })
  }
  return result
}
