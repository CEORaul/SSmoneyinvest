"use client"

import { Newspaper } from "lucide-react"
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
/// scroll grid + AI summary dialog. Tab switch, search, and filter changes
/// all go through the same getNewsFeedAction — never a page reload (per the
/// spec's "atualizar automaticamente a lista de notícias sem recarregar a
/// página"). A requestId guard discards any response that arrives after a
/// newer request has already been fired (fast tab-clicking never lets a
/// stale response overwrite fresher data).
export function NewsPageClient({ initialTab, initialArticles, initialNextCursor }: NewsPageClientProps) {
  const [activeTab, setActiveTab] = useState<NewsTabKey>(initialTab)
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
    getNewsFeedAction({ tab: activeTab, search, filters }).then((result) => {
      if (requestId !== requestIdRef.current) return
      setArticles(result.articles)
      setCursor(result.nextCursor)
      setLoading(false)
    })
  }, [activeTab, search, filters])

  async function handleLoadMore() {
    if (!cursor) return
    const requestId = requestIdRef.current
    setLoadingMore(true)
    const result = await getNewsFeedAction({ tab: activeTab, search, filters, cursor })
    if (requestId !== requestIdRef.current) return
    setArticles((current) => [...current, ...result.articles])
    setCursor(result.nextCursor)
    setLoadingMore(false)
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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as NewsTabKey)}>
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
