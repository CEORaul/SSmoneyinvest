import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { computeHealthScore, type HealthBucket } from "@/features/company/health-score"
import type { CompanyDetailDTO } from "@/features/company/queries"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import { cn } from "@/lib/utils"

interface ComparisonHealthScoreStripProps {
  companies: CompanyDetailDTO[]
}

const BUCKET_STYLES: Record<HealthBucket, string> = {
  Excelente: "text-gain",
  Boa: "text-gain",
  Regular: "text-amber-600 dark:text-amber-500",
  Fraca: "text-loss",
  "Muito Fraca": "text-loss",
}

/// Thin per-company wrapper around the unchanged computeHealthScore — same
/// function CompanyHealthScore already calls on the individual page, just
/// laid out as compact side-by-side circles instead of one full card. Only
/// STOCK/BDR carry a fundamentals-based score at all (same
/// hasFundamentals gate the individual page uses); companies outside that
/// are simply omitted rather than shown with a fabricated/zero score.
export function ComparisonHealthScoreStrip({ companies }: ComparisonHealthScoreStripProps) {
  const scored = companies
    .filter((company) => getAssetCategoryMeta(company.assetClass).hasFundamentals)
    .map((company) => ({ company, result: computeHealthScore(company) }))

  if (scored.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saúde comparada</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-6">
          {scored.map(({ company, result }) => (
            <div key={company.id} className="flex items-center gap-3">
              <TickerBadge ticker={company.ticker} logoUrl={company.logoUrl} size="sm" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">{company.ticker}</p>
                {result ? (
                  <p className={cn("text-lg font-bold tabular-nums", BUCKET_STYLES[result.bucket])}>
                    {result.score}
                    <span className="ml-1 text-xs font-medium">{result.bucket}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Dados insuficientes</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
