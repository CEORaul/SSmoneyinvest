"use client"

import { Sparkles } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { requestRadarSummaryAction } from "@/features/radar/actions"

/// On-demand "✨ Gerar resumo inteligente" — Gemini is genuinely configured
/// in this app (see ai-content-service.ts), so this attempts a real
/// generation rather than a placeholder; a null/failed result shows a quiet
/// unavailable line instead of an error, same convention as every other AI
/// surface in the app.
export function RadarAiSummaryButton() {
  const [state, setState] = useState<"idle" | "loading" | "loaded" | "unavailable">("idle")
  const [text, setText] = useState<string | null>(null)

  async function handleClick() {
    setState("loading")
    const result = await requestRadarSummaryAction()
    if (result.ok && result.text) {
      setText(result.text)
      setState("loaded")
    } else {
      setState("unavailable")
    }
  }

  if (state === "loaded" && text) {
    return (
      <p className="rounded-lg bg-primary/5 p-3 text-sm leading-relaxed">
        <Sparkles className="mr-1.5 inline size-3.5 text-primary" />
        {text}
      </p>
    )
  }

  if (state === "unavailable") {
    return <p className="text-sm text-muted-foreground">Resumo indisponível no momento.</p>
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} loading={state === "loading"}>
      {state !== "loading" && <Sparkles className="size-4" />}
      Gerar resumo inteligente
    </Button>
  )
}
