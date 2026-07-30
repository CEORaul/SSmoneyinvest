"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NEWS_SENTIMENT_EMOJI, NEWS_SENTIMENT_LABELS, type NewsArticleSentiment } from "@/features/news/types"
import { cn } from "@/lib/utils"

interface NewsSentimentBadgeProps {
  sentiment: NewsArticleSentiment
}

const SENTIMENT_STYLES: Record<NewsArticleSentiment["sentiment"], string> = {
  POSITIVE: "border-gain/30 bg-gain/10 text-gain hover:bg-gain/20",
  NEUTRAL:
    "border-amber-600/30 bg-amber-600/10 text-amber-600 hover:bg-amber-600/20 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-500 dark:hover:bg-amber-500/20",
  NEGATIVE: "border-loss/30 bg-loss/10 text-loss hover:bg-loss/20",
}

/// FinIA's sentiment classification for the article (never keyword-based —
/// see sentiment.ts's prompt) — a click reveals up to 3 justification
/// bullets, so the badge never asserts a sentiment without showing why.
export function NewsSentimentBadge({ sentiment }: NewsSentimentBadgeProps) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-5 shrink-0 items-center gap-1 rounded-4xl border px-2 py-0.5 text-xs font-medium transition-colors",
          SENTIMENT_STYLES[sentiment.sentiment]
        )}
      >
        <span aria-hidden>{NEWS_SENTIMENT_EMOJI[sentiment.sentiment]}</span>
        {NEWS_SENTIMENT_LABELS[sentiment.sentiment]}
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <p className="px-1 text-xs font-medium text-muted-foreground">Por que essa classificação?</p>
        {sentiment.reasons.length > 0 ? (
          <ul className="space-y-1 px-1 text-xs text-foreground">
            {sentiment.reasons.map((reason) => (
              <li key={reason} className="flex gap-1.5">
                <span aria-hidden>•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-1 text-xs text-muted-foreground">Nenhuma justificativa detalhada disponível.</p>
        )}
      </PopoverContent>
    </Popover>
  )
}
