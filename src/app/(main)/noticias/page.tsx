import { getNewsFeedAction } from "@/features/news/actions"
import { NewsPageClient } from "@/features/news/components/NewsPageClient"
import { NEWS_TAB_ORDER, type NewsTabKey } from "@/features/news/query-specs"
import { DEFAULT_NEWS_FEED_FILTERS } from "@/features/news/types"
import { requireUser } from "@/lib/auth/session"

// Server Actions on this page (getNewsFeedAction's per-company GNews
// refresh, requestNewsSummaryAction's Gemini call) can take longer than the
// platform's default function timeout, especially on a cold serverless
// start — this raises it so a slow-but-successful call doesn't get killed
// mid-flight (see maxDuration's Next.js docs: for Server Actions it must be
// set at the page level, not on the action itself).
export const maxDuration = 30

interface NoticiasPageProps {
  searchParams: Promise<{ tab?: string }>
}

function parseTab(raw: string | undefined): NewsTabKey {
  const candidate = raw as NewsTabKey
  return NEWS_TAB_ORDER.includes(candidate) ? candidate : "carteira"
}

/// The active tab lives in the URL, not just client state — any Server
/// Action on this page (requireUser() reading/refreshing the Supabase
/// session cookie counts, even ones that never call revalidatePath
/// themselves) can make Next.js re-render this route server-side in the
/// same round trip (see cookies.md: writing a cookie inside a Server
/// Function returns "the updated UI and new data in a single server
/// roundtrip"), which remounts the client tree below. Without the URL as
/// the source of truth, that remount always reset to whatever tab was
/// hardcoded here — this way it reconstructs the tab the user was actually
/// on. Mirrors /comparar's own "selection lives in the URL" pattern.
export default async function NoticiasPage({ searchParams }: NoticiasPageProps) {
  await requireUser()
  const { tab } = await searchParams
  const activeTab = parseTab(tab)

  const result = await getNewsFeedAction({ tab: activeTab, filters: DEFAULT_NEWS_FEED_FILTERS })

  return (
    <NewsPageClient
      key={activeTab}
      initialTab={activeTab}
      initialArticles={result.articles}
      initialNextCursor={result.nextCursor}
    />
  )
}
