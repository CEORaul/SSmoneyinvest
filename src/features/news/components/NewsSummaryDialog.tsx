"use client"

import { Loader2, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { requestNewsSummaryAction } from "@/features/news/actions"
import type { NewsArticleRow } from "@/features/news/types"

interface NewsSummaryDialogProps {
  article: NewsArticleRow | null
  onOpenChange: (open: boolean) => void
}

/// "✨ Resumir notícia" — the card's button click is itself the explicit
/// ask (unlike AnalyzeWatchlistPanel/ComparisonAnalysisPanel's own button
/// inside an already-open panel), so opening this dialog immediately
/// requests the structured summary. Zero free text either way: the prompt
/// is entirely fixed server-side in ai-content-service.ts, grounded only in
/// this article's own text.
export function NewsSummaryDialog({ article, onOpenChange }: NewsSummaryDialogProps) {
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "unavailable">("idle")
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    if (!article) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets local state to match the closed-dialog prop, not a derived side effect
      setStatus("idle")
      setText(null)
      return
    }

    setStatus("pending")
    setText(null)
    requestNewsSummaryAction(article.id).then((result) => {
      if (result.ok && result.text) {
        setText(result.text)
        setStatus("done")
      } else {
        setStatus("unavailable")
      }
    })
  }, [article])

  return (
    <Dialog open={article != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Resumir notícia
          </DialogTitle>
          {article && <DialogDescription className="line-clamp-2">{article.title}</DialogDescription>}
        </DialogHeader>

        {status === "pending" && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Gerando resumo...
          </div>
        )}

        {status === "done" && text && (
          <div className="max-h-[60vh] overflow-y-auto text-sm leading-relaxed whitespace-pre-line">{text}</div>
        )}

        {status === "unavailable" && (
          <p className="py-4 text-sm text-muted-foreground">
            Resumo indisponível no momento — tente novamente em instantes.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
