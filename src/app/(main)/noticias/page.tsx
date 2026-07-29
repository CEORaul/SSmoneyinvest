import { NewsPageClient } from "@/features/news/components/NewsPageClient"
import { getCompanyScopedFeed, getOwnedCompanyIds } from "@/features/news/queries"
import { DEFAULT_NEWS_FEED_FILTERS } from "@/features/news/types"
import { requireUser } from "@/lib/auth/session"

export default async function NoticiasPage() {
  const profile = await requireUser()

  const companyIds = await getOwnedCompanyIds(profile.id)
  const result = await getCompanyScopedFeed(companyIds, {
    filters: DEFAULT_NEWS_FEED_FILTERS,
    profileId: profile.id,
  })

  return (
    <NewsPageClient initialTab="carteira" initialArticles={result.articles} initialNextCursor={result.nextCursor} />
  )
}
