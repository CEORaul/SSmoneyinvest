import "server-only"

import type { AssetClass } from "@/generated/prisma/client"
import {
  COMPANY_DETAIL_INCLUDE,
  toDetailDTO,
  type ChartPeriod,
  type CompanyDetailDTO,
  type DividendPaymentDTO,
  type PricePointDTO,
} from "@/features/company/queries"
import { MAX_COMPARISON_ASSETS } from "@/features/comparator/constants"
import { prisma } from "@/lib/prisma"
import type { CompanyListItem } from "@/types"

/// Batched equivalent of calling getCompanyByTicker N times — one query,
/// same Decimal/BigInt serialization (toDetailDTO), re-sorted to match
/// input order so chip order in the UI is deterministic. Tickers that don't
/// resolve to a real company are silently dropped here — the page reports
/// which ones via a banner, this function just never throws for a typo.
export async function getCompaniesByTickers(tickers: string[]): Promise<CompanyDetailDTO[]> {
  const upper = tickers.map((t) => t.toUpperCase())
  if (upper.length === 0) return []

  const rows = await prisma.company.findMany({
    where: { ticker: { in: upper } },
    include: COMPANY_DETAIL_INCLUDE,
  })

  const byTicker = new Map(rows.map((row) => [row.ticker, row]))
  return upper
    .map((ticker) => byTicker.get(ticker))
    .filter((row): row is NonNullable<typeof row> => row != null)
    .map(toDetailDTO)
}

const PERIOD_DAYS: Record<Exclude<ChartPeriod, "1D" | "MAX">, number> = {
  "5D": 5,
  "1M": 30,
  "6M": 182,
  "1A": 365,
  "5A": 365 * 5,
}

/// Batched equivalent of getPriceHistoryForRange for N companies at once —
/// one query per period request, grouped into a Map in application code,
/// instead of N round trips. Mirrors getPriceHistoryForRange's exact
/// "1D"/"MAX"/windowed branching (that function operates on a single
/// companyId and can't be called N times without defeating the point of
/// batching, hence the small duplication of the branching logic here, not
/// the underlying Prisma access pattern).
export async function getPriceHistoryForCompanies(
  companyIds: string[],
  period: ChartPeriod
): Promise<Map<string, PricePointDTO[]>> {
  const result = new Map<string, PricePointDTO[]>()
  if (companyIds.length === 0) return result

  let rows: { companyId: string; date: Date; closeCents: number; volume: bigint | null }[]

  if (period === "1D") {
    // Two most recent points per company — Prisma has no native "top N per
    // group" for findMany, so fetch a generous window and slice per group.
    const recent = await prisma.priceHistoryPoint.findMany({
      where: { companyId: { in: companyIds } },
      orderBy: [{ companyId: "asc" }, { date: "desc" }],
      select: { companyId: true, date: true, closeCents: true, volume: true },
    })
    const seen = new Map<string, number>()
    rows = recent.filter((row) => {
      const count = seen.get(row.companyId) ?? 0
      if (count >= 2) return false
      seen.set(row.companyId, count + 1)
      return true
    })
  } else if (period === "MAX") {
    rows = await prisma.priceHistoryPoint.findMany({
      where: { companyId: { in: companyIds } },
      orderBy: { date: "asc" },
      select: { companyId: true, date: true, closeCents: true, volume: true },
    })
  } else {
    const since = new Date(Date.now() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000)
    rows = await prisma.priceHistoryPoint.findMany({
      where: { companyId: { in: companyIds }, date: { gte: since } },
      orderBy: { date: "asc" },
      select: { companyId: true, date: true, closeCents: true, volume: true },
    })
  }

  for (const row of rows) {
    const existing = result.get(row.companyId)
    const point = { date: row.date, closeCents: row.closeCents, volume: row.volume }
    if (existing) existing.push(point)
    else result.set(row.companyId, [point])
  }
  return result
}

/// Batched equivalent of getDividendHistory — backs the "Dividendos
/// acumulados" chart view mode and the AI comparison facts, one query
/// instead of N.
export async function getDividendHistoryForCompanies(
  companyIds: string[]
): Promise<Map<string, DividendPaymentDTO[]>> {
  const result = new Map<string, DividendPaymentDTO[]>()
  if (companyIds.length === 0) return result

  const rows = await prisma.dividendPayment.findMany({
    where: { companyId: { in: companyIds } },
    orderBy: { exDate: "desc" },
  })

  for (const row of rows) {
    const dto: DividendPaymentDTO = {
      id: row.id,
      type: row.type,
      amountPerShare: row.amountPerShare.toNumber(),
      exDate: row.exDate,
      paymentDate: row.paymentDate,
    }
    const existing = result.get(row.companyId)
    if (existing) existing.push(dto)
    else result.set(row.companyId, [dto])
  }
  return result
}

/// Market-wide "Todas as Ações/FIIs/ETFs/Criptos" quick-select — ranked by
/// market cap, capped at the comparator's own 10-asset limit so a quick-
/// select can never itself exceed what the picker allows.
export async function getTopCompaniesByAssetClass(
  assetClass: AssetClass,
  limit = MAX_COMPARISON_ASSETS
): Promise<CompanyListItem[]> {
  const rows = await prisma.company.findMany({
    where: { assetClass, priceCents: { gt: 0 } },
    orderBy: { marketCapCents: "desc" },
    take: limit,
  })
  return rows.map((row) => ({
    ticker: row.ticker,
    name: row.name,
    logoUrl: row.logoUrl,
    priceCents: row.priceCents,
    changePct: Number(row.priceChangePct),
    dividendYield: 0,
  }))
}
