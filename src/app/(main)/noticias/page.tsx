import { NewsPageClient } from "@/features/news/components/NewsPageClient"
import { getCompanyScopedFeed, getOwnedCompanyIds } from "@/features/news/queries"
import { DEFAULT_NEWS_FEED_FILTERS } from "@/features/news/types"
import { requireUser } from "@/lib/auth/session"

// Server Actions on this page (getNewsFeedAction's per-company GNews
// refresh, requestNewsSummaryAction's Gemini call) can take longer than the
// platform's default function timeout, especially on a cold serverless
// start — this raises it so a slow-but-successful call doesn't get killed
// mid-flight (see maxDuration's Next.js docs: for Server Actions it must be
// set at the page level, not on the action itself).
export const maxDuration = 30

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
