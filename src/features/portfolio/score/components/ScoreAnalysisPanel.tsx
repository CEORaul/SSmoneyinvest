import { Brain } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getScoreAnalysisForProfile } from "@/features/portfolio/score/summary"

interface ScoreAnalysisPanelProps {
  profileId: string
}

/// "Análise Inteligente" — Pontos fortes / Pontos de atenção / Oportunidades
/// de diversificação. Async Server Component, wrapped in <Suspense> by its
/// caller so a slow/failed generation never blocks the rest of the page.
export async function ScoreAnalysisPanel({ profileId }: ScoreAnalysisPanelProps) {
  const analysis = await getScoreAnalysisForProfile(profileId)

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-4 text-primary" />
          Análise Inteligente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {analysis ? (
          <p className="whitespace-pre-line text-sm leading-relaxed">{analysis.text}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Análise indisponível no momento.</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Análise informativa gerada por IA com base apenas nos dados da sua carteira — nunca uma recomendação de compra
          ou venda.
        </p>
      </CardContent>
    </Card>
  )
}
