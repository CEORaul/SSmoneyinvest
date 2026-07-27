import { PackageOpen } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddInvestmentButton } from "@/features/portfolio/components/AddInvestmentButton"
import { AllocationCharts } from "@/features/portfolio/components/AllocationCharts"
import { getMonthlyDividendsHistory } from "@/features/portfolio/analytics"
import { computeAssetAllocation, computeCategoryAllocation, computeSectorAllocation } from "@/features/portfolio/insights"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { getBenchmarkComparison } from "@/features/portfolio/score/benchmarks"
import { BenchmarkSection } from "@/features/portfolio/score/components/BenchmarkSection"
import { CriterionBreakdownList } from "@/features/portfolio/score/components/CriterionBreakdownList"
import { ScoreAiCardSuspense } from "@/features/portfolio/score/components/ScoreAiCardSuspense"
import { ScoreAnalysisPanelSuspense } from "@/features/portfolio/score/components/ScoreAnalysisPanelSuspense"
import { ScoreHeaderCard } from "@/features/portfolio/score/components/ScoreHeaderCard"
import { ScoreHistoryChart } from "@/features/portfolio/score/components/ScoreHistoryChart"
import { SimulateButton } from "@/features/portfolio/score/components/SimulateButton"
import { TopPositionsBarChart } from "@/features/portfolio/score/components/TopPositionsBarChart"
import { computePortfolioScore } from "@/features/portfolio/score/compute-score"
import { getScoreHistory, recordScoreSnapshotIfNeeded } from "@/features/portfolio/score/snapshots"
import { requireUser } from "@/lib/auth/session"

export default async function ScorePage() {
  const profile = await requireUser()
  const summary = await getPortfolioSummary(profile.id)
  const result = computePortfolioScore(summary)

  if (!result) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Score Inteligente da Carteira</h1>
          <p className="text-muted-foreground">
            Uma visão clara sobre diversificação, concentração e distribuição da sua carteira.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <PackageOpen className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium">Sua carteira está vazia</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Adicione seu primeiro investimento para calcularmos o Score Inteligente da sua carteira.
            </p>
          </div>
          <AddInvestmentButton />
        </div>
      </div>
    )
  }

  // One snapshot per calendar day — see PortfolioScoreSnapshot's doc
  // comment in schema.prisma for why there's no backfill.
  await recordScoreSnapshotIfNeeded(profile.id, result)

  const byCategory = computeCategoryAllocation(summary.byCategory)
  const bySector = computeSectorAllocation(summary.positions)
  const byAsset = computeAssetAllocation(summary.positions)

  const [monthlyDividends, benchmarks, history] = await Promise.all([
    getMonthlyDividendsHistory(profile.id),
    getBenchmarkComparison(profile.id, summary.totals),
    getScoreHistory(profile.id),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Score Inteligente da Carteira</h1>
          <p className="text-muted-foreground">
            Uma visão clara sobre diversificação, concentração e distribuição da sua carteira.
          </p>
        </div>
        <SimulateButton summary={summary} currentResult={result} />
      </div>

      <ScoreHeaderCard result={result}>
        <ScoreAiCardSuspense profileId={profile.id} />
      </ScoreHeaderCard>

      <ScoreAnalysisPanelSuspense profileId={profile.id} />

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento do Score</CardTitle>
        </CardHeader>
        <CardContent>
          <CriterionBreakdownList criteria={result.criteria} />
        </CardContent>
      </Card>

      <AllocationCharts byCategory={byCategory} bySector={bySector} byAsset={byAsset} monthlyDividends={monthlyDividends} />

      <TopPositionsBarChart positions={summary.positions} />

      <BenchmarkSection rows={benchmarks} />

      <ScoreHistoryChart points={history} />
    </div>
  )
}
