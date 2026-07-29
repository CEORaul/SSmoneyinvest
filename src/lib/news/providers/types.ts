/// One article as returned by a provider, already normalized to this app's
/// shape — the persistence layer (news-cache-service.ts) never sees a raw
/// provider payload, only this. `author` is legitimately null for providers
/// that don't supply one (GNews never does) — never guessed.
export interface NewsProviderArticle {
  externalId: string | null
  url: string
  title: string
  description: string | null
  content: string | null
  imageUrl: string | null
  author: string | null
  sourceName: string
  sourceUrl: string | null
  language: string | null
  country: string | null
  publishedAt: Date
}

export interface NewsSearchParams {
  query: string
  lang?: string
  country?: string
  max?: number
  sortBy?: "publishedAt" | "relevance"
}

export interface NewsTopHeadlinesParams {
  category?: string
  lang?: string
  country?: string
  max?: number
}

/// The contract every news provider must satisfy — GNews today
/// (gnews-provider.ts), Finnhub/NewsAPI/Financial Modeling Prep later. A new
/// provider is one new file implementing this interface plus one line in
/// providers/index.ts's registry; nothing that calls NewsService ever
/// changes. Mirrors src/lib/ai/providers/types.ts's AiProvider shape.
export interface NewsProviderClient {
  name: string
  search(params: NewsSearchParams): Promise<NewsProviderArticle[]>
  topHeadlines(params: NewsTopHeadlinesParams): Promise<NewsProviderArticle[]>
}
