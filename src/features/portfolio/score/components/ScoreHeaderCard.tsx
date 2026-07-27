import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { ScoreGauge } from "@/features/portfolio/score/components/ScoreGauge"
import type { PortfolioScoreResult } from "@/features/portfolio/score/types"

interface ScoreHeaderCardProps {
  result: PortfolioScoreResult
  /// The AI summary slot — a separate Suspense boundary streams in here so
  /// a slow/failed AI call never blocks the gauge/score, which render
  /// immediately from data the page already fetched.
  children?: ReactNode
}

export function ScoreHeaderCard({ result, children }: ScoreHeaderCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 py-8 text-center sm:flex-row sm:text-left">
        <ScoreGauge score={result.score} bucket={result.bucket} />
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Score Geral</p>
            <p className="text-2xl font-semibold tracking-tight">{result.bucket}</p>
            {result.weightUsed < 100 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Calculado com {result.weightUsed} de 100 pontos possíveis — alguns critérios não se aplicam à sua carteira
                atual (veja o detalhamento abaixo).
              </p>
            )}
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
