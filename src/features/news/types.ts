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
/// toggleFavoriteAction already expect, so the news card's integration
/// buttons never need a second lookup. The three `is*` flags are what
/// "Você possui PETR4"/"Você tem um alerta em MXRF11"/"Você favoritou
/// PRIO3" render from.
export interface NewsMatchedCompany {
  id: string
  ticker: string
  name: string
  logoUrl: string | null
  assetClass: AssetClass
  priceSource: PriceSource
  priceCents: number
  priceChangePct: number
  /// Same narrow fundamentals ARTICLE_INCLUDE already fetches for the AI
  /// facts builder (buildNewsFacts) — threaded through here too so the
  /// card's own UI can show "P/L 8,4 · DY 9,2%" under the ticker chip
  /// instead of only ever feeding an AI prompt with numbers the user never
  /// sees directly.
  priceToEarnings: number | null
  roe: number | null
  dividendYield: number | null
  isOwned: boolean
  isAlerted: boolean
  isFavorited: boolean
}

export type NewsSentimentLabel = "POSITIVE" | "NEUTRAL" | "NEGATIVE"

export const NEWS_SENTIMENT_LABELS: Record<NewsSentimentLabel, string> = {
  POSITIVE: "Positiva",
  NEUTRAL: "Neutra",
  NEGATIVE: "Negativa",
}

export const NEWS_SENTIMENT_EMOJI: Record<NewsSentimentLabel, string> = {
  POSITIVE: "🟢",
  NEUTRAL: "🟡",
  NEGATIVE: "🔴",
}

/// FinIA's full-context classification of an article — never keyword-based
/// (see ai-content-service.ts's getOrGenerateNewsSentiment prompt).
/// `reasons` is capped at 3 short justification bullets; `summary` is the
/// one-line "what happened" shown under the title. Null means generation
/// failed or hasn't happened yet — the card simply omits the badge/line,
/// never fabricates a sentiment.
export interface NewsArticleSentiment {
  sentiment: NewsSentimentLabel
  reasons: string[]
  summary: string
}

/// "Sua posição" sub-block — every field reused verbatim from
/// PortfolioPositionRow, never recomputed.
export interface NewsPositionSnapshot {
  quantity: string
  averagePriceCents: number
  currentPriceCents: number
  allocationPct: number
}

/// "Desempenho do ativo" sub-block — hoje comes straight off
/// Company.priceChangePct; the rest are computed once per feed page from a
/// single batched price-history call (see performance.ts), never per-card.
/// Any entry can be null when there isn't enough history yet — rendered as
/// "—", never estimated.
export interface NewsPerformanceSnapshot {
  todayPct: number | null
  sevenDayPct: number | null
  thirtyDayPct: number | null
  fiftyTwoWeekPct: number | null
}

export type NewsRelevanceReason = "owned" | "alerted" | "favorited"

/// The deterministic (never AI-generated) "por que esta notícia importa
/// para mim" answer — built entirely from real, already-known data
/// (portfolio position, alert, favorite). When an article matches several
/// of the user's companies, this picks the single most relevant one
/// (owned > alerted > favorited precedence) rather than showing one block
/// per company.
export interface NewsRelevance {
  company: NewsMatchedCompany
  reason: NewsRelevanceReason
  position: NewsPositionSnapshot | null
  performance: NewsPerformanceSnapshot
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
  sentiment: NewsArticleSentiment | null
  relevance: NewsRelevance | null
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
