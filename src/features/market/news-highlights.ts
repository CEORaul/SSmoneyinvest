import "server-only"

import { getBucketFeed } from "@/features/news/queries"
import { DEFAULT_NEWS_FEED_FILTERS, type NewsArticleRow } from "@/features/news/types"

/// Mercado 2.0's "Notícias em Destaque" needs to render for anonymous
/// visitors too (unlike /noticias, which gates every read behind
/// requireUser()) — this calls the exact same getBucketFeed("mercado", ...)
/// query /noticias itself uses, just without the auth requirement, so
/// there's no second news-fetching implementation anywhere in the app.
export async function getMarketNewsHighlights(profileId: string | null, limit = 6): Promise<NewsArticleRow[]> {
  const result = await getBucketFeed("mercado", { filters: DEFAULT_NEWS_FEED_FILTERS, profileId, limit })
  return result.articles
}
