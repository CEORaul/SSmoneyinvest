import "server-only"

import type { TransactionType } from "@/generated/prisma/client"
import { getPriceHistoryForCompanies } from "@/features/comparator/queries"
import { toDateKey } from "@/features/comparator/chart-modes"
import { prisma } from "@/lib/prisma"

/// Real DY/monthly-dividends/patrimony-history reads for the Carteira page's
/// new sections — every function here is read-only and never touches
/// src/services/portfolio-service.ts. Where a computation needs to replay
/// Transaction history (patrimony over time), it deliberately mirrors only
/// the quantity/invested bookkeeping rules from recomputePosition (BUY/
/// BONUS/SPLIT add, REVERSE_SPLIT/SELL subtract, DIVIDEND/JCP don't touch
/// quantity) — never the write-time concerns (realized-profit patching,
/// negative-quantity guard) that belong to that file alone.

const DIVIDEND_TYPES: TransactionType[] = ["DIVIDEND", "JCP"]

/// "Dividendos recebidos no mês" — real sum over the current calendar
/// month, not the position's all-time totalDividendsCents.
export async function getDividendsReceivedThisMonth(profileId: string): Promise<number> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const rows = await prisma.transaction.findMany({
    where: { profileId, type: { in: DIVIDEND_TYPES }, date: { gte: monthStart } },
    select: { totalCents: true },
  })
  return rows.reduce((sum, row) => sum + Number(row.totalCents), 0)
}

export interface MonthlyDividendPoint {
  /// "YYYY-MM"
  month: string
  totalCents: number
}

/// Backs the "Dividendos por mês" bar chart — one groupBy over the whole
/// dividend/JCP history, bucketed by calendar month in application code
/// (Postgres date_trunc via Prisma's query builder isn't available here
/// without raw SQL, and the row count is small enough that this is fine).
export async function getMonthlyDividendsHistory(
  profileId: string,
  monthsBack = 12
): Promise<MonthlyDividendPoint[]> {
  const since = new Date()
  since.setMonth(since.getMonth() - monthsBack)
  since.setDate(1)

  const rows = await prisma.transaction.findMany({
    where: { profileId, type: { in: DIVIDEND_TYPES }, date: { gte: since } },
    select: { date: true, totalCents: true },
  })

  const byMonth = new Map<string, number>()
  for (const row of rows) {
    const key = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, "0")}`
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(row.totalCents))
  }

  // Always return every month in the window, zero-filled — a bar chart
  // with silently-skipped empty months would misread as "no data" instead
  // of "no dividends that month."
  const points: MonthlyDividendPoint[] = []
  const cursor = new Date(since)
  const end = new Date()
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
    points.push({ month: key, totalCents: byMonth.get(key) ?? 0 })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return points
}

export interface TimelineEvent {
  id: string
  type: TransactionType
  ticker: string
  name: string
  logoUrl: string | null
  date: string
  quantity: string
  totalCents: number
  note: string | null
}

/// Chronological feed of every transaction across the whole portfolio —
/// compras, vendas, dividendos, JCP, bonificações, desdobramentos,
/// agrupamentos — for the "Timeline" section.
export async function getPortfolioTimeline(profileId: string, limit = 200): Promise<TimelineEvent[]> {
  const rows = await prisma.transaction.findMany({
    where: { profileId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { company: { select: { ticker: true, name: true, logoUrl: true } } },
  })

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    ticker: row.company.ticker,
    name: row.company.name,
    logoUrl: row.company.logoUrl,
    date: row.date.toISOString(),
    quantity: row.quantity.toString(),
    totalCents: Number(row.totalCents),
    note: row.note,
  }))
}

export type PatrimonyPeriod = "1M" | "3M" | "6M" | "1A" | "5A" | "MAX"

const PATRIMONY_PERIOD_DAYS: Record<Exclude<PatrimonyPeriod, "MAX">, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 182,
  "1A": 365,
  "5A": 365 * 5,
}

export interface PatrimonyPoint {
  date: string
  valueCents: number
  investedCents: number
}

/// Real portfolio-value-over-time — replays every BUY/SELL/BONUS/SPLIT/
/// REVERSE_SPLIT transaction to get quantity-held-per-company-per-day, then
/// multiplies by that day's real price (last known price carried forward,
/// same convention /comparar's chart already uses — never a fabricated
/// price). `investedCents` is the running cost basis at each date, letting
/// the caller derive real cumulative return (%) without a second query.
export async function getPatrimonyHistory(
  profileId: string,
  period: PatrimonyPeriod
): Promise<PatrimonyPoint[]> {
  const transactions = await prisma.transaction.findMany({
    where: { profileId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: { companyId: true, type: true, date: true, quantity: true, totalCents: true },
  })
  if (transactions.length === 0) return []

  const companyIds = [...new Set(transactions.map((t) => t.companyId))]
  const since =
    period === "MAX"
      ? transactions[0].date
      : new Date(Date.now() - PATRIMONY_PERIOD_DAYS[period] * 24 * 60 * 60 * 1000)

  const priceHistory = await getPriceHistoryForCompanies(companyIds, period === "MAX" ? "MAX" : "5A")

  // Every real date any company has a price point, restricted to the
  // window — the day-by-day axis this function reports on.
  const allDateKeys = new Set<string>()
  for (const points of priceHistory.values()) {
    for (const point of points) {
      const key = toDateKey(point.date)
      if (point.date >= since) allDateKeys.add(key)
    }
  }
  // Always include "today" so the line reaches the present even if no
  // company happened to sync a price exactly today.
  allDateKeys.add(toDateKey(new Date()))
  const sortedDates = [...allDateKeys].sort()
  if (sortedDates.length === 0) return []

  // Per-company: date key -> last known real closeCents as of that date
  // (forward-filled, same "last observation carried forward" convention as
  // the comparator chart).
  const priceByCompanyAndDate = new Map<string, Map<string, number>>()
  for (const companyId of companyIds) {
    const points = [...(priceHistory.get(companyId) ?? [])].sort((a, b) => a.date.getTime() - b.date.getTime())
    const byDate = new Map<string, number>()
    let lastKnown: number | null = null
    let pointIndex = 0
    for (const dateKey of sortedDates) {
      while (pointIndex < points.length && toDateKey(points[pointIndex].date) <= dateKey) {
        lastKnown = points[pointIndex].closeCents
        pointIndex += 1
      }
      if (lastKnown != null) byDate.set(dateKey, lastKnown)
    }
    priceByCompanyAndDate.set(companyId, byDate)
  }

  // Per-company running quantity/invested, replayed transaction-by-
  // transaction as the date cursor advances — mirrors recomputePosition's
  // bookkeeping rules exactly (see file header), read-only.
  const quantityByCompany = new Map<string, number>()
  const investedByCompany = new Map<string, number>()
  let transactionIndex = 0

  const result: PatrimonyPoint[] = []
  for (const dateKey of sortedDates) {
    while (
      transactionIndex < transactions.length &&
      toDateKey(transactions[transactionIndex].date) <= dateKey
    ) {
      const t = transactions[transactionIndex]
      const quantity = quantityByCompany.get(t.companyId) ?? 0
      const invested = investedByCompany.get(t.companyId) ?? 0
      const txQuantity = Number(t.quantity)
      const txTotal = Number(t.totalCents)

      switch (t.type) {
        case "BUY":
        case "BONUS":
        case "SPLIT":
          quantityByCompany.set(t.companyId, quantity + txQuantity)
          investedByCompany.set(t.companyId, invested + txTotal)
          break
        case "REVERSE_SPLIT":
          quantityByCompany.set(t.companyId, Math.max(0, quantity - txQuantity))
          break
        case "SELL": {
          const avgPrice = quantity > 0 ? invested / quantity : 0
          const costBasis = avgPrice * txQuantity
          const nextQuantity = quantity - txQuantity
          quantityByCompany.set(t.companyId, nextQuantity)
          investedByCompany.set(t.companyId, nextQuantity > 0 ? invested - costBasis : 0)
          break
        }
        // DIVIDEND/JCP never touch quantity or cost basis.
      }
      transactionIndex += 1
    }

    let valueCents = 0
    let investedCents = 0
    for (const companyId of companyIds) {
      const quantity = quantityByCompany.get(companyId) ?? 0
      if (quantity <= 0) continue
      const price = priceByCompanyAndDate.get(companyId)?.get(dateKey)
      if (price != null) valueCents += quantity * price
      investedCents += investedByCompany.get(companyId) ?? 0
    }
    result.push({ date: dateKey, valueCents: Math.round(valueCents), investedCents: Math.round(investedCents) })
  }

  return result
}
