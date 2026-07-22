"use client"

import { useMemo, useState } from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FinancialChart, type ChartSeries } from "@/features/company/components/FinancialChart"
import type { ChartPeriod } from "@/features/company/queries"
import { getPriceHistoryForCompaniesAction } from "@/features/comparator/actions"
import {
  computeViewModeSeries,
  VIEW_MODE_LABELS,
  type ComparisonViewMode,
  type RawDividendPoint,
  type RawPricePoint,
} from "@/features/comparator/chart-modes"
import { assignColors } from "@/features/comparator/colors"
import { formatCurrencyCents, formatPercent } from "@/utils/format"

export interface ChartCompanyInput {
  companyId: string
  ticker: string
  pricePoints: RawPricePoint[]
  dividendPoints: RawDividendPoint[]
  /// null = not held by the signed-in user (or no user signed in) — gates
  /// the three position-dependent view modes per company.
  position: { quantity: number; investedCents: number } | null
}

interface ComparisonChartSectionProps {
  companies: ChartCompanyInput[]
  initialPeriod: ChartPeriod
}

const VIEW_MODES: ComparisonViewMode[] = [
  "PRICE",
  "RETURN_PCT",
  "DIVIDENDS_ACCUMULATED",
  "INVESTED",
  "CURRENT_VALUE",
  "PROFIT",
]

function getValueFormatter(mode: ComparisonViewMode): (value: number) => string {
  if (mode === "RETURN_PCT") return formatPercent
  // DIVIDENDS_ACCUMULATED sums DividendPayment.amountPerShare — a whole-real
  // per-share figure, not cents — so it's adapted through formatCurrencyCents
  // (×100) rather than a second currency formatter.
  if (mode === "DIVIDENDS_ACCUMULATED") return (value) => formatCurrencyCents(value * 100)
  return formatCurrencyCents
}

/// Owns the view-mode toggle (Preço/Rentabilidade %/.../Lucro) and the
/// period-tab refetch for comparison mode — the generalized FinancialChart
/// stays completely agnostic of view modes, it only ever renders whatever
/// `series` this component hands it.
export function ComparisonChartSection({ companies, initialPeriod }: ComparisonChartSectionProps) {
  const [period, setPeriod] = useState<ChartPeriod>(initialPeriod)
  const [viewMode, setViewMode] = useState<ComparisonViewMode>("PRICE")
  const [pricePointsByCompany, setPricePointsByCompany] = useState<Map<string, RawPricePoint[]>>(
    () => new Map(companies.map((c) => [c.companyId, c.pricePoints]))
  )
  const [isLoading, setIsLoading] = useState(false)

  const colors = useMemo(() => assignColors(companies.map((c) => c.companyId)), [companies])

  async function handlePeriodChange(next: ChartPeriod) {
    setPeriod(next)
    setIsLoading(true)
    const result = await getPriceHistoryForCompaniesAction(
      companies.map((c) => c.companyId),
      next
    )
    setPricePointsByCompany(new Map(result.map((r) => [r.companyId, r.points])))
    setIsLoading(false)
  }

  const series: ChartSeries[] = companies.map((company) => {
    const modeSeries = computeViewModeSeries(
      {
        companyId: company.companyId,
        ticker: company.ticker,
        color: "",
        pricePoints: pricePointsByCompany.get(company.companyId) ?? [],
        dividendPoints: company.dividendPoints,
        position: company.position,
      },
      viewMode
    )
    const assignment = colors.get(company.companyId)
    return {
      companyId: company.companyId,
      ticker: company.ticker,
      color: assignment?.color ?? "var(--primary)",
      dashed: assignment?.dashed,
      points: modeSeries.points,
      unavailableReason: modeSeries.unavailableReason,
    }
  })

  return (
    <div className="space-y-3">
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ComparisonViewMode)}>
        <TabsList>
          {VIEW_MODES.map((mode) => (
            <TabsTrigger key={mode} value={mode}>
              {VIEW_MODE_LABELS[mode]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <FinancialChart
        companyId={companies[0]?.companyId ?? ""}
        initialPeriod={initialPeriod}
        initialPoints={[]}
        series={series}
        period={period}
        onPeriodChange={handlePeriodChange}
        isLoading={isLoading}
        valueFormatter={getValueFormatter(viewMode)}
      />
    </div>
  )
}
