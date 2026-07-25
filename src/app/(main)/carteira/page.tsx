import { PackageOpen } from "lucide-react"
import { Suspense } from "react"

import { AddInvestmentButton } from "@/features/portfolio/components/AddInvestmentButton"
import { AllocationCharts } from "@/features/portfolio/components/AllocationCharts"
import { InsightsSection } from "@/features/portfolio/components/InsightsSection"
import { PatrimonyEvolutionSection } from "@/features/portfolio/components/PatrimonyEvolutionSection"
import { PortfolioBoard } from "@/features/portfolio/components/PortfolioBoard"
import { PortfolioSummaryCards } from "@/features/portfolio/components/PortfolioSummaryCards"
import { PriceSyncStatus } from "@/features/portfolio/components/PriceSyncStatus"
import { RebalancingSection } from "@/features/portfolio/components/RebalancingSection"
import { TimelineSection } from "@/features/portfolio/components/TimelineSection"
import { TopMoversCards } from "@/features/portfolio/components/TopMoversCards"
import {
  getDividendsReceivedThisMonth,
  getMonthlyDividendsHistory,
  getPatrimonyHistory,
  getPortfolioTimeline,
} from "@/features/portfolio/analytics"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { computeRebalancing, getTargetAllocations } from "@/features/portfolio/rebalancing"
import {
  computeAssetAllocation,
  computeCategoryAllocation,
  computePortfolioInsights,
  computeSectorAllocation,
  computeTopMovers,
} from "@/features/portfolio/insights"
import { toDateKey } from "@/features/comparator/chart-modes"
import { getPriceHistoryForCompanies } from "@/features/comparator/queries"
import { getLastDirectorySyncStatus } from "@/features/market-sync/sync-status"
import { requireUser } from "@/lib/auth/session"

export default async function CarteiraPage() {
  const profile = await requireUser()
  const [{ positions, totals, byCategory }, { lastSyncedAt }] = await Promise.all([
    getPortfolioSummary(profile.id),
    getLastDirectorySyncStatus(),
  ])

  if (positions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Carteira</h1>
            <p className="text-muted-foreground">
              Acompanhe suas posições, compras, vendas e proventos.
            </p>
            <div className="mt-1">
              <PriceSyncStatus lastSyncedAt={lastSyncedAt} />
            </div>
          </div>
          <AddInvestmentButton />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <PackageOpen className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium">Sua carteira está vazia</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Adicione seu primeiro investimento — escolha a categoria, informe a data e a
              quantidade, o preço é preenchido automaticamente quando possível.
            </p>
          </div>
          <AddInvestmentButton />
        </div>
      </div>
    )
  }

  const companyIds = positions.map((p) => p.companyId)

  const [
    targets,
    dividendsReceivedThisMonthCents,
    monthlyDividends,
    timeline,
    patrimonyHistory,
    priceHistoryMap,
  ] = await Promise.all([
    getTargetAllocations(profile.id),
    getDividendsReceivedThisMonth(profile.id),
    getMonthlyDividendsHistory(profile.id),
    getPortfolioTimeline(profile.id),
    getPatrimonyHistory(profile.id, "6M"),
    getPriceHistoryForCompanies(companyIds, "1M"),
  ])

  const rebalancingRows = computeRebalancing(byCategory, targets, totals.currentValueCents)
  const topMovers = computeTopMovers(positions)
  const insights = computePortfolioInsights(positions, totals, dividendsReceivedThisMonthCents)
  const categoryAllocation = computeCategoryAllocation(byCategory)
  const sectorAllocation = computeSectorAllocation(positions)
  const assetAllocation = computeAssetAllocation(positions)

  const priceHistories = companyIds.map((companyId) => ({
    companyId,
    points: (priceHistoryMap.get(companyId) ?? []).map((point) => ({
      date: toDateKey(point.date),
      closeCents: point.closeCents,
    })),
  }))

  const monthlyChangeByCompany = priceHistories
    .filter((p) => p.points.length >= 2)
    .map((p) => ({
      companyId: p.companyId,
      changePct:
        ((p.points[p.points.length - 1].closeCents - p.points[0].closeCents) / p.points[0].closeCents) * 100,
    }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Carteira</h1>
          <p className="text-muted-foreground">
            Acompanhe suas posições, compras, vendas e proventos.
          </p>
          <div className="mt-1">
            <PriceSyncStatus lastSyncedAt={lastSyncedAt} />
          </div>
        </div>
        <AddInvestmentButton />
      </div>

      <PortfolioSummaryCards totals={totals} />
      <TopMoversCards topMovers={topMovers} dividendsReceivedThisMonthCents={dividendsReceivedThisMonthCents} />

      <Suspense fallback={null}>
        <PortfolioBoard
          byCategory={byCategory}
          priceHistories={priceHistories}
          monthlyChangeByCompany={monthlyChangeByCompany}
        />
      </Suspense>

      <PatrimonyEvolutionSection initialPoints={patrimonyHistory} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RebalancingSection rows={rebalancingRows} />
        <InsightsSection insights={insights} />
      </div>

      <AllocationCharts
        byCategory={categoryAllocation}
        bySector={sectorAllocation}
        byAsset={assetAllocation}
        monthlyDividends={monthlyDividends}
      />

      <TimelineSection events={timeline} />
    </div>
  )
}
