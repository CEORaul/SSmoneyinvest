"use client"

import { Loader2, Sparkles } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requestComparisonAnalysisAction } from "@/features/comparator/actions"

interface ComparisonAnalysisPanelProps {
  tickers: string[]
}

/// Borrows the "click to ask, server decides what's real to say" shape from
/// AiIndicatorPopover (not the component itself — this is a full panel, not
/// a per-cell popover). One button, zero free text: the prompt is entirely
/// fixed server-side in ai-content-service.ts.
export function ComparisonAnalysisPanel({ tickers }: ComparisonAnalysisPanelProps) {
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "unavailable">("idle")
  const [text, setText] = useState<string | null>(null)

  async function handleAnalyze() {
    setStatus("pending")
    const result = await requestComparisonAnalysisAction(tickers)
    if (result.ok && result.text) {
      setText(result.text)
      setStatus("done")
    } else {
      setStatus("unavailable")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Comparador com IA
        </CardTitle>
        {status !== "done" && (
          <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={status === "pending"}>
            {status === "pending" && <Loader2 className="size-3.5 animate-spin" />}
            Analisar Comparação
          </Button>
        )}
      </CardHeader>
      {status === "done" && text && (
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-line">{text}</p>
        </CardContent>
      )}
      {status === "unavailable" && (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Análise indisponível no momento — tente novamente em instantes.
          </p>
        </CardContent>
      )}
      {status === "idle" && (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            A IA interpreta apenas os dados já exibidos nesta comparação — nunca inventa números.
          </p>
        </CardContent>
      )}
    </Card>
  )
}
