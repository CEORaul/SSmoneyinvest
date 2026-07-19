import "server-only"

import { TRAILING_DIVIDEND_WINDOW_DAYS } from "@/features/market/dividend-yield"
import { prisma } from "@/lib/prisma"
import type { CompanyListItem } from "@/types"

const POPULAR_TICKERS = [
  "PETR4",
  "VALE3",
  "BBAS3",
  "ITUB4",
  "WEGE3",
  "TAEE11",
  "MXRF11",
]

interface CompanyRow {
  ticker: string
  name: string
  priceCents: number
  priceChangePct: unknown
}

function toListItem(company: CompanyRow, dividendYield = 0): CompanyListItem {
  return {
    ticker: company.ticker,
    name: company.name,
    priceCents: company.priceCents,
    changePct: Number(company.priceChangePct),
    dividendYield,
  }
}

/// All four of these read from Postgres only — Company/DividendPayment rows
/// kept warm by the sync jobs in src/features/market-sync/. Never calls the
/// market-data provider directly (see MarketDataService for why).

export async function getTopGainers(limit = 4): Promise<CompanyListItem[]> {
  const companies = await prisma.company.findMany({
    where: { priceCents: { gt: 0 } },
    orderBy: { priceChangePct: "desc" },
    take: limit,
  })
  return companies.map((company) => toListItem(company))
}

export async function getTopLosers(limit = 4): Promise<CompanyListItem[]> {
  const companies = await prisma.company.findMany({
    where: { priceCents: { gt: 0 } },
    orderBy: { priceChangePct: "asc" },
    take: limit,
  })
  return companies.map((company) => toListItem(company))
}

/// "Destaque" = largest by market cap — real, defensible stand-in for a
/// curated editorial pick, using data every company actually has.
export async function getHighlightedCompanies(limit = 4): Promise<CompanyListItem[]> {
  const companies = await prisma.company.findMany({
    where: { marketCapCents: { not: null } },
    orderBy: { marketCapCents: "desc" },
    take: limit,
  })
  return companies.map((company) => toListItem(company))
}

/// Trailing-12-month dividend yield, computed from real DividendPayment
/// rows rather than a fundamentals field the free API tier doesn't expose.
/// Only companies with at least one payment in the window can appear here —
/// currently just the provider's sandbox tickers until BRAPI_API_TOKEN
/// unlocks detail sync for the full universe.
export async function getTopDividendPayers(limit = 4): Promise<CompanyListItem[]> {
  const since = new Date(Date.now() - TRAILING_DIVIDEND_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const grouped = await prisma.dividendPayment.groupBy({
    by: ["companyId"],
    where: { exDate: { gte: since } },
    _sum: { amountPerShare: true },
  })
  if (grouped.length === 0) return []

  const totalByCompanyId = new Map(
    grouped.map((row) => [row.companyId, Number(row._sum.amountPerShare ?? 0)])
  )

  const companies = await prisma.company.findMany({
    where: { id: { in: [...totalByCompanyId.keys()] }, priceCents: { gt: 0 } },
  })

  return companies
    .map((company) => {
      const totalDividends = totalByCompanyId.get(company.id) ?? 0
      const dividendYield = (totalDividends / (company.priceCents / 100)) * 100
      return toListItem(company, dividendYield)
    })
    .sort((a, b) => b.dividendYield - a.dividendYield)
    .slice(0, limit)
}

export async function getPopularCompanies(): Promise<CompanyListItem[]> {
  const companies = await prisma.company.findMany({
    where: { ticker: { in: POPULAR_TICKERS } },
  })
  const byTicker = new Map(companies.map((company) => [company.ticker, company]))

  return POPULAR_TICKERS.map((ticker) => byTicker.get(ticker))
    .filter((company): company is NonNullable<typeof company> => company != null)
    .map((company) => toListItem(company))
}
