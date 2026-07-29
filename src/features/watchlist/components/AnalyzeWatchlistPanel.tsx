"use client"

import { Loader2, Sparkles } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requestWatchlistAnalysisAction } from "@/features/watchlist/actions"

interface AnalyzeWatchlistPanelProps {
  watchlistId: string
}

/// "✨ Analisar Watchlist" — same click-to-ask shape as
/// ComparisonAnalysisPanel/ScoreAnalysisPanel: one button, zero free text,
/// the prompt is entirely fixed server-side and explicitly forbidden from
/// ever recommending buying/selling/adding an asset (see
/// getOrGenerateWatchlistAnalysis) — this is informational only, about
/// assets the user is observing, not necessarily owns.
export function AnalyzeWatchlistPanel({ watchlistId }: AnalyzeWatchlistPanelProps) {
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "unavailable">("idle")
  const [text, setText] = useState<string | null>(null)

  async function handleAnalyze() {
    setStatus("pending")
    const result = await requestWatchlistAnalysisAction(watchlistId)
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
          Análise do Monitor de Ativos
        </CardTitle>
        {status !== "done" && (
          <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={status === "pending"}>
            {status === "pending" && <Loader2 className="size-3.5 animate-spin" />}
            Analisar Monitor de Ativos
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
            Análise indisponível no momento — adicione ativos à lista ou tente novamente em instantes.
          </p>
        </CardContent>
      )}
      {status === "idle" && (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            A IA interpreta apenas os ativos já presentes nesta lista — nunca recomenda comprar, vender
            ou adicionar ativos.
          </p>
        </CardContent>
      )}
    </Card>
  )
}
