"use client"

import { Bookmark, ExternalLink, GraduationCap, Share2, Sparkles } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toggleSaveNewsArticleAction } from "@/features/news/actions"
import { NewsArticleQuickActions } from "@/features/news/components/NewsArticleQuickActions"
import { NewsRelevancePanel } from "@/features/news/components/NewsRelevancePanel"
import { NewsSentimentBadge } from "@/features/news/components/NewsSentimentBadge"
import { NEWS_TOPIC_LABELS, type NewsArticleRow } from "@/features/news/types"
import { cn } from "@/lib/utils"
import { formatAbsoluteTime, formatRelativeTime } from "@/utils/format"

interface NewsCardProps {
  article: NewsArticleRow
  onSummarize: (article: NewsArticleRow) => void
  onExplainBeginner: (article: NewsArticleRow) => void
}

/// One card per article: image, source/date + sentiment badge, title, resumo
/// em uma frase, category + matched-ticker chips (with impact badges), the
/// "por que importa" panel, and every action the spec asks for ("Card da
/// Notícia" + "Integração"). Sentiment/relevance are computed server-side
/// (see queries.ts's getPersonalContext/selectPrimaryCompany + sentiment.ts),
/// never re-derived here.
export function NewsCard({ article, onSummarize, onExplainBeginner }: NewsCardProps) {
  const [saved, setSaved] = useState(article.isSaved)
  const [saving, setSaving] = useState(false)

  const publishedDate = new Date(article.publishedAt)

  async function handleSave() {
    setSaving(true)
    const result = await toggleSaveNewsArticleAction(article.id)
    setSaving(false)
    if (result.ok) {
      setSaved(result.saved ?? !saved)
    } else {
      toast.error(result.error ?? "Não foi possível salvar a notícia.")
    }
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: article.title, url: article.url })
        return
      } catch {
        // User canceled the native share sheet — fall through to clipboard.
      }
    }
    await navigator.clipboard.writeText(article.url)
    toast.success("Link copiado.")
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40">
      {article.imageUrl && (
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="block aspect-video w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- external, unpredictable provider-hosted images; next/image would require an ever-growing remotePatterns allowlist */}
          <img src={article.imageUrl} alt={article.title} className="size-full object-cover" loading="lazy" />
        </a>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{article.sourceName}</span>
          {article.author && <span>· {article.author}</span>}
          <span title={formatAbsoluteTime(publishedDate)}>· {formatRelativeTime(publishedDate)}</span>
          {article.sentiment && (
            <span className="ml-auto">
              <NewsSentimentBadge sentiment={article.sentiment} />
            </span>
          )}
        </div>

        <a href={article.url} target="_blank" rel="noopener noreferrer" className="space-y-1.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug hover:underline">{article.title}</h3>
          {article.sentiment && (
            <p className="text-xs font-medium text-foreground">{article.sentiment.summary}</p>
          )}
          {article.description && (
            <p className="line-clamp-3 text-sm text-muted-foreground">{article.description}</p>
          )}
        </a>

        {article.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {article.topics.map((topic) => (
              <Badge key={topic} variant="secondary">
                {NEWS_TOPIC_LABELS[topic]}
              </Badge>
            ))}
          </div>
        )}

        {article.matchedCompanies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {article.matchedCompanies.map((company) => (
              <NewsArticleQuickActions key={company.id} company={company} />
            ))}
          </div>
        )}

        <NewsRelevancePanel relevance={article.relevance} />

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<a href={article.url} target="_blank" rel="noopener noreferrer" />}
            >
              <ExternalLink className="size-3.5" />
              Abrir notícia
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onSummarize(article)}>
              <Sparkles className="size-3.5" />
              Resumir
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onExplainBeginner(article)}>
              <GraduationCap className="size-3.5" />
              Explique como se eu fosse iniciante
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Compartilhar" onClick={handleShare}>
              <Share2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={saved ? "Remover dos salvos" : "Salvar"}
              disabled={saving}
              onClick={handleSave}
            >
              <Bookmark className={cn("size-4", saved && "fill-current text-primary")} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
