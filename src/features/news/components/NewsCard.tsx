"use client"

import { Bookmark, ExternalLink, Share2, Sparkles } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toggleSaveNewsArticleAction } from "@/features/news/actions"
import { NewsArticleQuickActions } from "@/features/news/components/NewsArticleQuickActions"
import { NEWS_TOPIC_LABELS, type NewsArticleRow, type NewsMatchedCompany } from "@/features/news/types"
import { cn } from "@/lib/utils"
import { formatAbsoluteTime, formatRelativeTime } from "@/utils/format"

interface NewsCardProps {
  article: NewsArticleRow
  onSummarize: (article: NewsArticleRow) => void
}

function getRelevanceMessage(companies: NewsMatchedCompany[]): string | null {
  for (const company of companies) {
    if (company.isOwned) return `Você possui ${company.ticker}.`
    if (company.isWatchlisted) return `${company.ticker} está no seu Monitor de Ativos.`
    if (company.isFavorited) return `Você acompanha ${company.ticker}.`
  }
  return null
}

/// One card per article — image, title, resumo, fonte/autor/data, category
/// + matched-ticker chips, and every action the spec asks for ("Card da
/// Notícia" + "Integração"). Personalization ("Esta notícia é relevante
/// para você") is computed from the already-hydrated matchedCompanies
/// flags (see queries.ts's getPersonalContext), never re-derived here.
export function NewsCard({ article, onSummarize }: NewsCardProps) {
  const [saved, setSaved] = useState(article.isSaved)
  const [saving, setSaving] = useState(false)

  const relevance = getRelevanceMessage(article.matchedCompanies)
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
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{article.sourceName}</span>
          {article.author && <span>· {article.author}</span>}
          <span title={formatAbsoluteTime(publishedDate)}>· {formatRelativeTime(publishedDate)}</span>
        </div>

        <a href={article.url} target="_blank" rel="noopener noreferrer" className="space-y-1.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug hover:underline">{article.title}</h3>
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

        {relevance && (
          <p className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
            ✨ Esta notícia é relevante para você — {relevance}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex items-center gap-1">
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
