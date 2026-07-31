import "server-only"

import { searchMarketAssets } from "@/features/market/discovery-queries"
import { DEFAULT_MARKET_FILTERS, type MarketAssetRow } from "@/features/market/discovery-types"
import { prisma } from "@/lib/prisma"

/// Real per-day dividend calendar rows for Mercado 2.0's "Calendário do
/// Dia" section — the one real data source among that section's five rows
/// (Resultados/Assembleias/Fatos relevantes/Eventos econômicos have no
/// backing table anywhere in this app, same honest gap Radar already
/// documents for its own calendar). Brazil hasn't observed DST since 2019,
/// so a fixed -03:00 offset is safe year-round for the day boundary.
const brtDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })

function brtDateKey(date = new Date()): string {
  return brtDateFormatter.format(date)
}

function todayRangeInBrt(): { start: Date; end: Date } {
  const dateKey = brtDateKey()
  const start = new Date(`${dateKey}T00:00:00-03:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

export interface DividendCalendarEvent {
  companyId: string
  ticker: string
  name: string
  logoUrl: string | null
  type: string
  amountPerShare: number
  exDate: Date
  paymentDate: Date | null
}

/// Ex-dividend events landing today — real DividendPayment rows, never a
/// placeholder. Ordered by declared amount so the biggest payouts surface
/// first within the same day.
export async function getTodayDividendEvents(limit = 8): Promise<DividendCalendarEvent[]> {
  const { start, end } = todayRangeInBrt()

  const payments = await prisma.dividendPayment.findMany({
    where: { exDate: { gte: start, lt: end } },
    orderBy: { amountPerShare: "desc" },
    take: limit,
    include: { company: { select: { id: true, ticker: true, name: true, logoUrl: true } } },
  })

  return payments.map((payment) => ({
    companyId: payment.company.id,
    ticker: payment.company.ticker,
    name: payment.company.name,
    logoUrl: payment.company.logoUrl,
    type: payment.type,
    amountPerShare: Number(payment.amountPerShare),
    exDate: payment.exDate,
    paymentDate: payment.paymentDate,
  }))
}

/// "FIIs em Destaque" — reuses the exact same searchMarketAssets the
/// /mercado filter board itself runs (never a parallel query), scoped to
/// FII and sorted by market cap so it's real, defensible "principais," with
/// the richer MarketAssetRow shape (Dividend Yield/P-VP/Liquidez) the
/// spec's own field list for this section asks for.
export async function getFiiHighlights(limit = 8): Promise<MarketAssetRow[]> {
  const result = await searchMarketAssets({ ...DEFAULT_MARKET_FILTERS, categoria: "FII" }, "marketcap-desc", 1, limit)
  return result.rows
}

/// "ETFs" section — same reuse pattern as getFiiHighlights, scoped to ETF.
export async function getEtfHighlights(limit = 8): Promise<MarketAssetRow[]> {
  const result = await searchMarketAssets({ ...DEFAULT_MARKET_FILTERS, categoria: "ETF" }, "marketcap-desc", 1, limit)
  return result.rows
}
