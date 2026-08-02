"use client"

import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { assignColors } from "@/features/comparator/colors"
import { getHistoricalMetricAction } from "@/features/company/actions"
import { FinancialChart, type ChartSeries } from "@/features/company/components/FinancialChart"
import type { HistoricoMetric, HistoricoSeries } from "@/features/company/historico/types"
import { formatCurrencyCents, formatPercent } from "@/utils/format"

interface HistoricoSectionProps {
  companyId: string
}

const METRICS: HistoricoMetric[] = ["RECEITA", "LUCRO", "PATRIMONIO", "DIVIDENDOS", "ROE", "MARGENS", "FLUXO_CAIXA"]

const METRIC_LABELS: Record<HistoricoMetric, string> = {
  RECEITA: "Receita",
  LUCRO: "Lucro",
  PATRIMONIO: "Patrimônio",
  DIVIDENDOS: "Dividendos",
  ROE: "ROE",
  MARGENS: "Margens",
  FLUXO_CAIXA: "Fluxo de Caixa",
}

function getValueFormatter(metric: HistoricoMetric): (value: number) => string {
  if (metric === "ROE" || metric === "MARGENS") return formatPercent
  // Per-share values (reais, not cents) — same adaptation ComparisonChartSection
  // uses for DIVIDENDS_ACCUMULATED.
  if (metric === "DIVIDENDOS") return (value) => formatCurrencyCents(value * 100)
  return formatCurrencyCents
}

/// Multi-year trend view for the same statement history Demonstrativos
/// tabulates — reuses FinancialChart's comparison-mode multi-series
/// rendering (period tabs hidden via showPeriodTabs=false, since these are
/// fixed annual series, not a price-history range) rather than a second
/// chart implementation.
export function HistoricoSection({ companyId }: HistoricoSectionProps) {
  const [metric, setMetric] = useState<HistoricoMetric>("RECEITA")
  const [loaded, setLoaded] = useState<{ requestKey: string; series: HistoricoSeries[] } | null>(null)
  const requestKey = `${companyId}:${metric}`

  useEffect(() => {
    let cancelled = false
    getHistoricalMetricAction(companyId, metric).then((result) => {
      if (!cancelled) setLoaded({ requestKey: `${companyId}:${metric}`, series: result })
    })
    return () => {
      cancelled = true
    }
  }, [companyId, metric])

  const rawSeries = loaded?.requestKey === requestKey ? loaded.series : null

  const colors = useMemo(() => assignColors((rawSeries ?? []).map((s) => s.id)), [rawSeries])

  const series: ChartSeries[] | null =
    rawSeries?.map((s) => ({
      companyId: s.id,
      ticker: s.label,
      color: colors.get(s.id)?.color ?? "var(--primary)",
      points: s.points,
    })) ?? null

  const isEmpty = series != null && series.every((s) => s.points.length === 0)

  return (
    <section id="historico" className="scroll-mt-24 space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">Histórico</h2>
      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{METRIC_LABELS[metric]}</CardTitle>
          <Tabs value={metric} onValueChange={(value) => setMetric(value as HistoricoMetric)}>
            <TabsList>
              {METRICS.map((key) => (
                <TabsTrigger key={key} value={key}>
                  {METRIC_LABELS[key]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {series === null ? (
            <Skeleton className="h-72 w-full rounded-lg" />
          ) : isEmpty ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              Nenhum histórico disponível para este indicador ainda.
            </div>
          ) : (
            <FinancialChart
              companyId={companyId}
              initialPeriod="MAX"
              initialPoints={[]}
              series={series}
              showPeriodTabs={false}
              valueFormatter={getValueFormatter(metric)}
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}
