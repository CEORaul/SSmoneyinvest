"use client"

import { Loader2, Sparkles } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { explainWithFiniaAction } from "@/features/finia/actions"

interface ExplainWithAiButtonProps {
  question: string
  contextFacts?: string[]
  label?: string
}

/// The generic "✨ Explicar com IA" affordance for pages that don't already
/// have an equivalent (Empresa has AiIndicatorPopover, Comparador has
/// ComparisonAnalysisPanel, Score/Radar have their own AI cards — none of
/// those are duplicated here). Single fixed question per instance (same
/// "zero free text" principle as AiIndicatorPopover), answered fresh each
/// time via AIService directly — no AiContent caching for this one, since
/// usage volume doesn't yet justify a new cache dimension; that can be
/// added later by giving it its own AiContentKind if it turns out to be
/// popular.
export function ExplainWithAiButton({ question, contextFacts = [], label = "Explicar com IA" }: ExplainWithAiButtonProps) {
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  async function handleOpenChange(open: boolean) {
    if (!open || answer || loading) return
    setLoading(true)
    const result = await explainWithFiniaAction(question, contextFacts)
    setLoading(false)
    if (result) setAnswer(result)
    else setUnavailable(true)
  }

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <Sparkles className="size-3.5" />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Consultando a FinIA...
          </div>
        ) : answer ? (
          <p className="text-sm leading-relaxed">{answer}</p>
        ) : unavailable ? (
          <p className="text-sm text-muted-foreground">Explicação indisponível no momento.</p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
