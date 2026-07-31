"use client"

import { Newspaper } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { NewsBeginnerExplanationDialog } from "@/features/news/components/NewsBeginnerExplanationDialog"
import { NewsCard } from "@/features/news/components/NewsCard"
import { NewsSummaryDialog } from "@/features/news/components/NewsSummaryDialog"
import type { NewsArticleRow } from "@/features/news/types"

interface MarketNewsHighlightsProps {
  articles: NewsArticleRow[]
}

/// Mercado 2.0's "Notícias em Destaque" — reuses NewsCard and its AI
/// dialogs completely unchanged, mirroring NewsPageClient's own minimal
/// dialog-state shape (summarizing/explaining). The AI action buttons still
/// require login (same requireUser() gate as /noticias) — an anonymous
/// visitor clicking one is redirected to sign in, the same behavior every
/// other AI action in this app already has, not a new limitation.
export function MarketNewsHighlights({ articles }: MarketNewsHighlightsProps) {
  const [summarizing, setSummarizing] = useState<NewsArticleRow | null>(null)
  const [explaining, setExplaining] = useState<NewsArticleRow | null>(null)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Newspaper className="size-5 text-primary" />
          Notícias em Destaque
        </h2>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/noticias" />}>
          Ver todas
        </Button>
      </div>

      {articles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => (
            <NewsCard key={article.id} article={article} onSummarize={setSummarizing} onExplainBeginner={setExplaining} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhuma notícia disponível no momento.
        </p>
      )}

      <NewsSummaryDialog article={summarizing} onOpenChange={(open) => !open && setSummarizing(null)} />
      <NewsBeginnerExplanationDialog article={explaining} onOpenChange={(open) => !open && setExplaining(null)} />
    </section>
  )
}
