import type { AssetClass, NewsTopic, PriceSource } from "@/generated/prisma/client"

export type { NewsTopic }

export const NEWS_TOPIC_LABELS: Record<NewsTopic, string> = {
  DIVIDENDS: "Dividendos",
  EARNINGS: "Resultados",
  ACQUISITIONS: "Aquisições",
  MERGERS: "Fusões",
  ECONOMY: "Economia",
  POLITICS: "Política",
  TECHNOLOGY: "Tecnologia",
  AI: "IA",
  CRYPTO: "Cripto",
}

export type NewsDateRange = "hoje" | "7dias" | "30dias" | "todos"

export const NEWS_DATE_RANGE_LABELS: Record<NewsDateRange, string> = {
  hoje: "Hoje",
  "7dias": "7 dias",
  "30dias": "30 dias",
  todos: "Todos",
}

/// A Company matched inside an article's text (see company-matcher.ts) —
/// carries exactly the fields TradeDialog/CreateAlertDialog/
/// addWatchlistItemAction/toggleFavoriteAction already expect, so the news
/// card's integration buttons never need a second lookup. The three
/// `is*` flags are what "Você possui PETR4"/"Você acompanha MXRF11"/"Este
/// ativo está no seu Monitor de Ativos" render from.
export interface NewsMatchedCompany {
  id: string
  ticker: string
  name: string
  logoUrl: string | null
  assetClass: AssetClass
  priceSource: PriceSource
  priceCents: number
  isOwned: boolean
  isWatchlisted: boolean
  isFavorited: boolean
}

export interface NewsArticleRow {
  id: string
  title: string
  description: string | null
  content: string | null
  imageUrl: string | null
  author: string | null
  sourceName: string
  sourceUrl: string | null
  url: string
  publishedAt: string
  topics: NewsTopic[]
  matchedCompanies: NewsMatchedCompany[]
  isSaved: boolean
}

export interface NewsFeedFilters {
  dateRange: NewsDateRange
  topics: NewsTopic[]
}

export const DEFAULT_NEWS_FEED_FILTERS: NewsFeedFilters = {
  dateRange: "todos",
  topics: [],
}

export interface NewsFeedResult {
  articles: NewsArticleRow[]
  nextCursor: string | null
}
