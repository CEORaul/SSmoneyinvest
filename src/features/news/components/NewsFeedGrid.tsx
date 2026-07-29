"use client"

import { Loader2 } from "lucide-react"
import { useCallback } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { NewsCard } from "@/features/news/components/NewsCard"
import type { NewsArticleRow } from "@/features/news/types"
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll"

interface NewsFeedGridProps {
  articles: NewsArticleRow[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
  onSummarize: (article: NewsArticleRow) => void
}

/// Infinite scroll via useInfiniteScrollSentinel — "load more" fires
/// automatically as the sentinel enters the viewport, no button needed
/// (satisfies the spec's "Infinite Scroll" requirement directly).
export function NewsFeedGrid({ articles, loading, loadingMore, hasMore, onLoadMore, onSummarize }: NewsFeedGridProps) {
  const handleIntersect = useCallback(() => {
    if (hasMore && !loading && !loadingMore) onLoadMore()
  }, [hasMore, loading, loadingMore, onLoadMore])

  const sentinelRef = useInfiniteScrollSentinel(handleIntersect, hasMore && !loading)

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-80 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nenhuma notícia encontrada.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} onSummarize={onSummarize} />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {loadingMore && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        </div>
      )}
    </div>
  )
}
