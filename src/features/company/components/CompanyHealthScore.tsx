import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { computeHealthScore, type HealthBucket } from "@/features/company/health-score"
import type { CompanyDetailDTO } from "@/features/company/queries"
import { cn } from "@/lib/utils"

interface CompanyHealthScoreProps {
  dto: CompanyDetailDTO
}

const BUCKET_STYLES: Record<HealthBucket, string> = {
  Excelente: "text-gain",
  Boa: "text-gain",
  Regular: "text-amber-600 dark:text-amber-500",
  Fraca: "text-loss",
  "Muito Fraca": "text-loss",
}

export function CompanyHealthScore({ dto }: CompanyHealthScoreProps) {
  const result = computeHealthScore(dto)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saúde da Empresa</CardTitle>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="flex items-center gap-4">
            <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full ring-4 ring-muted">
              <span className="text-xl font-bold tabular-nums">{result.score}</span>
            </div>
            <div>
              <p className={cn("text-lg font-semibold", BUCKET_STYLES[result.bucket])}>{result.bucket}</p>
              <p className="text-xs text-muted-foreground">
                Baseado em {result.dimensionsUsed} de 5 dimensões disponíveis nesta fonte.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Dados insuficientes nesta fonte para calcular um score de saúde confiável.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
