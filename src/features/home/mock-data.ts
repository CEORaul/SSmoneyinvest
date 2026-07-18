import type { MockCompany } from "@/features/home/types"

/// Placeholder market data for the pre-launch landing page — replaced by
/// real Company/Stock/Fii/Etf rows once the Mercado/Ações/FIIs/ETFs phases
/// wire up actual queries.
export const MOCK_COMPANIES: MockCompany[] = [
  { ticker: "PETR4", name: "Petrobras", assetClass: "STOCK", sector: "Petróleo e Gás", priceCents: 3842, changePct: 2.14, dividendYield: 14.2, highlighted: true },
  { ticker: "VALE3", name: "Vale", assetClass: "STOCK", sector: "Mineração", priceCents: 6215, changePct: -1.32, dividendYield: 9.8, highlighted: true },
  { ticker: "BBAS3", name: "Banco do Brasil", assetClass: "STOCK", sector: "Financeiro", priceCents: 2871, changePct: 1.05, dividendYield: 11.4, highlighted: true },
  { ticker: "ITUB4", name: "Itaú Unibanco", assetClass: "STOCK", sector: "Financeiro", priceCents: 3459, changePct: 0.62, dividendYield: 6.1, highlighted: true },
  { ticker: "WEGE3", name: "WEG", assetClass: "STOCK", sector: "Bens Industriais", priceCents: 4128, changePct: 3.47, dividendYield: 1.9, highlighted: true },
  { ticker: "TAEE11", name: "Taesa", assetClass: "STOCK", sector: "Energia Elétrica", priceCents: 3675, changePct: 0.28, dividendYield: 9.6, highlighted: false },
  { ticker: "MXRF11", name: "Maxi Renda", assetClass: "FII", sector: "Papel", priceCents: 1042, changePct: -0.48, dividendYield: 12.8, highlighted: true },
  { ticker: "HGLG11", name: "CSHG Logística", assetClass: "FII", sector: "Logística", priceCents: 16820, changePct: -2.16, dividendYield: 8.7, highlighted: false },
  { ticker: "KNRI11", name: "Kinea Renda Imobiliária", assetClass: "FII", sector: "Lajes Corporativas", priceCents: 15340, changePct: 1.88, dividendYield: 7.9, highlighted: false },
  { ticker: "IVVB11", name: "iShares S&P 500", assetClass: "ETF", sector: "Renda Variável Internacional", priceCents: 29840, changePct: 4.21, dividendYield: 0.6, highlighted: false },
  { ticker: "BOVA11", name: "iShares Ibovespa", assetClass: "ETF", sector: "Renda Variável Brasil", priceCents: 12960, changePct: -3.05, dividendYield: 2.1, highlighted: false },
  { ticker: "PRIO3", name: "PRIO", assetClass: "STOCK", sector: "Petróleo e Gás", priceCents: 4523, changePct: -4.18, dividendYield: 0, highlighted: false },
]

export const POPULAR_TICKERS = [
  "PETR4",
  "VALE3",
  "BBAS3",
  "ITUB4",
  "WEGE3",
  "TAEE11",
  "MXRF11",
]

export function getTopDividendPayers(limit = 4): MockCompany[] {
  return [...MOCK_COMPANIES]
    .sort((a, b) => b.dividendYield - a.dividendYield)
    .slice(0, limit)
}

export function getTopGainers(limit = 4): MockCompany[] {
  return [...MOCK_COMPANIES]
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, limit)
}

export function getTopLosers(limit = 4): MockCompany[] {
  return [...MOCK_COMPANIES]
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, limit)
}

export function getHighlightedCompanies(limit = 4): MockCompany[] {
  return MOCK_COMPANIES.filter((company) => company.highlighted).slice(0, limit)
}

export function getPopularCompanies(): MockCompany[] {
  return POPULAR_TICKERS.map(
    (ticker) => MOCK_COMPANIES.find((company) => company.ticker === ticker)!
  )
}
