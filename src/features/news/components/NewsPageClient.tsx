"use client"

import { Newspaper } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getNewsFeedAction } from "@/features/news/actions"
import { NewsFeedGrid } from "@/features/news/components/NewsFeedGrid"
import { NewsFilterBar } from "@/features/news/components/NewsFilterBar"
import { NewsSearchBar } from "@/features/news/components/NewsSearchBar"
import { NewsSummaryDialog } from "@/features/news/components/NewsSummaryDialog"
import { NEWS_TAB_LABELS, NEWS_TAB_ORDER, type NewsTabKey } from "@/features/news/query-specs"
import { DEFAULT_NEWS_FEED_FILTERS, type NewsArticleRow, type NewsFeedFilters } from "@/features/news/types"

interface NewsPageClientProps {
  initialTab: NewsTabKey
  initialArticles: NewsArticleRow[]
  initialNextCursor: string | null
}

/// The whole /noticias experience: tabs + search + filters + infinite-
/// scroll grid + AI summary dialog.
///
/// The active tab is NOT local state — it's a prop derived from the URL
/// (`?tab=`), and the page.tsx Server Component that renders this gives it
/// a `key={activeTab}`, so switching tabs is a real (but reload-free)
/// navigation that always mounts a fresh instance seeded with that tab's
/// real data. This matters because /noticias' Server Actions (favoritar,
/// alerta, salvar, resumir — all of them, via requireUser()) occasionally
/// refresh the Supabase session cookie, and this Next.js fork
/// re-renders the whole route server-side in that same round trip whenever
/// a cookie is written inside a Server Action — which remounts this
/// component. Keeping the tab in the URL means that remount reconstructs
/// the tab the user was actually on instead of snapping back to a
/// hardcoded default. Search/filters stay local client state, refetched
/// through getNewsFeedAction without touching the URL — the same class of
/// remount can still reset them, which is an acceptable smaller regression
/// next to landing on the wrong tab entirely.
export function NewsPageClient({ initialTab, initialArticles, initialNextCursor }: NewsPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<NewsFeedFilters>(DEFAULT_NEWS_FEED_FILTERS)
  const [articles, setArticles] = useState<NewsArticleRow[]>(initialArticles)
  const [cursor, setCursor] = useState<string | null>(initialNextCursor)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [summarizing, setSummarizing] = useState<NewsArticleRow | null>(null)

  const requestIdRef = useRef(0)
  const skipNextFetchRef = useRef(true)

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false
      return
    }

    const requestId = ++requestIdRef.current
    setLoading(true)
    getNewsFeedAction({ tab: initialTab, search, filters }).then((result) => {
      if (requestId !== requestIdRef.current) return
      setArticles(result.articles)
      setCursor(result.nextCursor)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialTab is fixed for this component's whole lifetime (a tab change remounts via the parent's key), only search/filters should re-arm this
  }, [search, filters])

  async function handleLoadMore() {
    if (!cursor) return
    const requestId = requestIdRef.current
    setLoadingMore(true)
    const result = await getNewsFeedAction({ tab: initialTab, search, filters, cursor })
    if (requestId !== requestIdRef.current) return
    setArticles((current) => [...current, ...result.articles])
    setCursor(result.nextCursor)
    setLoadingMore(false)
  }

  function handleTabChange(tab: NewsTabKey) {
    router.replace(`${pathname}?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Newspaper className="size-6 text-primary" />
          Notícias
        </h1>
        <p className="text-sm text-muted-foreground">
          Central de notícias financeiras, personalizada para você.
        </p>
      </div>

      <Tabs value={initialTab} onValueChange={(value) => handleTabChange(value as NewsTabKey)}>
        <TabsList className="h-auto flex-wrap">
          {NEWS_TAB_ORDER.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {NEWS_TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <NewsSearchBar value={search} onChange={setSearch} />
        <NewsFilterBar filters={filters} onChange={setFilters} />
      </div>

      <NewsFeedGrid
        articles={articles}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={cursor != null}
        onLoadMore={handleLoadMore}
        onSummarize={setSummarizing}
      />

      <NewsSummaryDialog article={summarizing} onOpenChange={(open) => !open && setSummarizing(null)} />
    </div>
  )
}
