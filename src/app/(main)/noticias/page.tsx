import { NewsPageClient } from "@/features/news/components/NewsPageClient"
import { getPersonalizedFeed } from "@/features/news/queries"
import { DEFAULT_NEWS_FEED_FILTERS } from "@/features/news/types"
import { requireUser } from "@/lib/auth/session"

export default async function NoticiasPage() {
  const profile = await requireUser()
  const result = await getPersonalizedFeed(profile.id, { filters: DEFAULT_NEWS_FEED_FILTERS })

  return (
    <NewsPageClient initialTab="para-voce" initialArticles={result.articles} initialNextCursor={result.nextCursor} />
  )
}
