import "server-only"

import { fetchWithRetry } from "@/lib/market-data/http"
import type {
  NewsProviderArticle,
  NewsProviderClient,
  NewsSearchParams,
  NewsTopHeadlinesParams,
} from "@/lib/news/providers/types"

const BASE_URL = "https://gnews.io/api/v4"

interface GNewsArticle {
  id?: string
  title: string
  description: string | null
  content: string | null
  url: string
  image: string | null
  publishedAt: string
  lang?: string
  source: { id?: string; name: string; url?: string; country?: string }
}

interface GNewsResponse {
  totalArticles: number
  articles: GNewsArticle[]
}

function toProviderArticle(article: GNewsArticle): NewsProviderArticle {
  return {
    externalId: article.id ?? null,
    url: article.url,
    title: article.title,
    description: article.description,
    content: article.content,
    imageUrl: article.image,
    // GNews never supplies a byline — never guessed.
    author: null,
    sourceName: article.source.name,
    sourceUrl: article.source.url ?? null,
    language: article.lang ?? null,
    country: article.source.country ?? null,
    publishedAt: new Date(article.publishedAt),
  }
}

async function callEndpoint(path: string, params: Record<string, string | number | undefined>): Promise<NewsProviderArticle[]> {
  const apiKey = process.env.GNEWS_API_KEY
  if (!apiKey) throw new Error("GNEWS_API_KEY não configurada")

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value))
  }
  query.set("apikey", apiKey)

  const response = await fetchWithRetry(`${BASE_URL}${path}?${query.toString()}`)
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`GNews respondeu ${response.status}: ${body.slice(0, 200)}`)
  }

  const data = (await response.json()) as GNewsResponse
  return data.articles.map(toProviderArticle)
}

/// Real GNews HTTP client (https://gnews.io) — the only file allowed to
/// build a GNews request URL or parse its response shape. Reuses the
/// existing fetchWithRetry (timeout + backoff on 429/5xx, fails fast on
/// 401/403) instead of a bespoke HTTP layer.
export const gnewsProvider: NewsProviderClient = {
  name: "gnews",

  search({ query, lang, country, max, sortBy }: NewsSearchParams): Promise<NewsProviderArticle[]> {
    return callEndpoint("/search", {
      q: query,
      lang,
      country,
      max: max ?? 10,
      sortby: sortBy ?? "publishedAt",
    })
  },

  topHeadlines({ category, lang, country, max }: NewsTopHeadlinesParams): Promise<NewsProviderArticle[]> {
    return callEndpoint("/top-headlines", {
      category: category ?? "general",
      lang,
      country,
      max: max ?? 10,
    })
  },
}
