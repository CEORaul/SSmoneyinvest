import { gnewsProvider } from "@/lib/news/providers/gnews-provider"
import type { NewsProviderClient } from "@/lib/news/providers/types"

/// Every news provider this app knows how to talk to. Adding Finnhub/
/// NewsAPI/Financial Modeling Prep later means implementing
/// NewsProviderClient once (see gnews-provider.ts for the shape) and adding
/// one line here — never a change to news-service.ts or any caller.
export const NEWS_PROVIDERS: Record<string, NewsProviderClient> = {
  gnews: gnewsProvider,
}

export const DEFAULT_NEWS_PROVIDER = "gnews"
