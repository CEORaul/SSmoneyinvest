import "server-only"

import { DEFAULT_NEWS_PROVIDER, NEWS_PROVIDERS } from "@/lib/news/providers"
import type { NewsProviderArticle, NewsSearchParams, NewsTopHeadlinesParams } from "@/lib/news/providers/types"

function getActiveProvider() {
  const name = process.env.NEWS_PROVIDER || DEFAULT_NEWS_PROVIDER
  return NEWS_PROVIDERS[name] ?? NEWS_PROVIDERS[DEFAULT_NEWS_PROVIDER]
}

/// The ONLY code allowed to call a news provider SDK/HTTP API directly —
/// every news feature in the app (news-cache-service.ts's bucket refresh)
/// goes through this, never straight to gnews-provider.ts or any future
/// provider. Mirrors AIService's exclusivity over the AI provider layer and
/// MarketDataService's exclusivity over BRAPI/Yahoo. Swapping the active
/// provider is a NEWS_PROVIDER env var change — no code change.
export const NewsService = {
  search(params: NewsSearchParams): Promise<NewsProviderArticle[]> {
    return getActiveProvider().search(params)
  },
  topHeadlines(params: NewsTopHeadlinesParams): Promise<NewsProviderArticle[]> {
    return getActiveProvider().topHeadlines(params)
  },
  get activeProviderName(): string {
    return getActiveProvider().name
  },
}
