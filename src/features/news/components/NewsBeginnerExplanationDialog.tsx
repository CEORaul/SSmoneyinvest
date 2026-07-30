"use client"

import { GraduationCap, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { requestBeginnerExplanationAction } from "@/features/news/actions"
import type { NewsArticleRow } from "@/features/news/types"

interface NewsBeginnerExplanationDialogProps {
  article: NewsArticleRow | null
  onOpenChange: (open: boolean) => void
}

/// "Explique como se eu fosse iniciante" — same click-is-the-ask pattern as
/// NewsSummaryDialog, just a different AI kind (NEWS_BEGINNER_EXPLANATION)
/// and prompt. Translates financial jargon into plain language, grounded
/// only in this article's own text.
export function NewsBeginnerExplanationDialog({ article, onOpenChange }: NewsBeginnerExplanationDialogProps) {
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "unavailable">("idle")
  const [text, setText] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!article) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets local state to match the closed-dialog prop, not a derived side effect
      setStatus("idle")
      setText(null)
      return
    }

    const requestId = ++requestIdRef.current
    setStatus("pending")
    setText(null)
    requestBeginnerExplanationAction(article.id)
      .then((result) => {
        if (requestId !== requestIdRef.current) return
        if (result.ok && result.text) {
          setText(result.text)
          setStatus("done")
        } else {
          setStatus("unavailable")
        }
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return
        setStatus("unavailable")
      })
  }, [article])

  return (
    <Dialog open={article != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="size-4 text-primary" />
            Explicação para iniciantes
          </DialogTitle>
          {article && <DialogDescription className="line-clamp-2">{article.title}</DialogDescription>}
        </DialogHeader>

        {status === "pending" && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Simplificando a notícia...
          </div>
        )}

        {status === "done" && text && (
          <div className="max-h-[60vh] overflow-y-auto text-sm leading-relaxed whitespace-pre-line">{text}</div>
        )}

        {status === "unavailable" && (
          <p className="py-4 text-sm text-muted-foreground">
            Explicação indisponível no momento — tente novamente em instantes.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
