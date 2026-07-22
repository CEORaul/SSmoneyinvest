"use client"

import { useEffect, useRef, useState } from "react"
import { Area, AreaChart, Brush, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getPriceHistoryAction, type PricePointRow } from "@/features/company/actions"
import type { ChartPeriod } from "@/features/company/queries"
import { cn } from "@/lib/utils"
import { formatCompactNumber, formatCurrencyCents } from "@/utils/format"

export interface ChartSeriesPoint {
  date: string
  value: number | null
}

export interface ChartSeries {
  companyId: string
  ticker: string
  color: string
  /// Composite encoding for the 9th/10th asset past the validated 8-hue
  /// palette (see comparator/colors.ts) — never a fabricated new hue.
  dashed?: boolean
  points: ChartSeriesPoint[]
  /// Set when a position-dependent view mode (Valor investido/atual/Lucro)
  /// has nothing real to plot for this company — rendered as a legend note,
  /// never a fake flat/zero line.
  unavailableReason?: string
}

interface FinancialChartProps {
  companyId: string
  initialPeriod: ChartPeriod
  initialPoints: PricePointRow[]
  /// Switches the chart into multi-asset comparison mode: N lines instead of
  /// one, driven entirely by this array. Absent = byte-for-byte the original
  /// single-company behavior (companyId/initialPoints still drive that path).
  series?: ChartSeries[]
  /// Comparison mode is "controlled" for the period tabs — the parent
  /// (ComparisonChartSection) owns the batched fetch + view-mode recompute
  /// (it needs dividend/position data this component never has), so period
  /// changes call this instead of fetching internally.
  period?: ChartPeriod
  onPeriodChange?: (period: ChartPeriod) => void
  isLoading?: boolean
  /// Formats the Y-axis/tooltip value — defaults to BRL cents. Comparison
  /// mode passes a different formatter per view mode (e.g. percent for
  /// Rentabilidade %).
  valueFormatter?: (value: number) => string
}

const PERIODS: { value: ChartPeriod; label: string }[] = [
  { value: "1D", label: "1D" },
  { value: "5D", label: "5D" },
  { value: "1M", label: "1M" },
  { value: "6M", label: "6M" },
  { value: "1A", label: "1A" },
  { value: "5A", label: "5A" },
  { value: "MAX", label: "Máximo" },
]

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })

interface TooltipPayloadItem {
  payload: { date: string; closeCents: number; volume: string | null }
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{dateFormatter.format(new Date(point.date))}</p>
      <p className="text-muted-foreground">Preço: {formatCurrencyCents(point.closeCents)}</p>
      {point.volume != null && (
        <p className="text-muted-foreground">Volume: {formatCompactNumber(BigInt(point.volume))}</p>
      )}
    </div>
  )
}

interface MergedRow {
  date: string
  [companyId: string]: string | number | null
}

/// Small intentional duplication of comparator/chart-modes.ts's
/// mergeSeriesByDate — that module lives one layer above this component
/// (company → comparator, never the reverse), so importing it here would
/// invert the dependency direction. The merge logic itself is ~10 lines;
/// duplicating it is cheaper than the layering violation.
/// Forward-fills each series onto every date in the shared axis with its
/// own last known real value, rather than leaving a true null on any date
/// that isn't exactly one of that series' own points. This is what makes
/// the tooltip (and the line) show every visible series together when
/// hovering, even when companies were synced at different granularities
/// (daily vs. weekly vs. monthly, a real provider-side difference, not a
/// bug) — "last reported price" is a standard, honest convention, not a
/// fabricated in-between value. A series still shows nothing before its
/// own first real point (no data to carry forward from yet).
function mergeSeriesByDate(series: ChartSeries[]): MergedRow[] {
  const allDates = new Set<string>()
  for (const s of series) {
    for (const point of s.points) allDates.add(point.date)
  }
  const sortedDates = [...allDates].sort()

  const pointMaps = series.map((s) => new Map(s.points.map((p) => [p.date, p.value])))
  const lastKnown = new Map<string, number | null>(series.map((s) => [s.companyId, null]))

  return sortedDates.map((date) => {
    const row: MergedRow = { date }
    series.forEach((s, index) => {
      const exact = pointMaps[index].get(date)
      if (exact !== undefined) lastKnown.set(s.companyId, exact)
      row[s.companyId] = lastKnown.get(s.companyId) ?? null
    })
    return row
  })
}

interface ComparisonTooltipPayloadItem {
  dataKey: string
  value: number | null
  color: string
}

function ComparisonTooltip({
  active,
  payload,
  label,
  series,
  formatValue,
}: {
  active?: boolean
  payload?: ComparisonTooltipPayloadItem[]
  label?: string
  series: ChartSeries[]
  formatValue: (value: number) => string
}) {
  if (!active || !payload?.length || !label) return null
  const byId = new Map(series.map((s) => [s.companyId, s]))

  return (
    <div className="min-w-40 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{dateFormatter.format(new Date(label))}</p>
      <div className="space-y-1">
        {payload.map((entry) => {
          const s = byId.get(entry.dataKey)
          if (!s || entry.value == null) return null
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {s.ticker}
              </span>
              <span className="font-medium tabular-nums">{formatValue(entry.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/// The first Recharts usage in this app — recharts@3.9.2 was already an
/// installed dependency, just unused until now. "1D" is deliberately not a
/// smooth intraday curve: PriceHistoryPoint is daily-close-only (BRAPI's
/// current plan doesn't expose intraday bars), so "1D" renders the two most
/// recent daily closes with an inline note rather than fabricating minutes-
/// level detail that doesn't exist in the data.
export function FinancialChart({
  companyId,
  initialPeriod,
  initialPoints,
  series,
  period: controlledPeriod,
  onPeriodChange,
  isLoading: controlledLoading,
  valueFormatter,
}: FinancialChartProps) {
  const isComparisonMode = series != null

  const [internalPeriod, setInternalPeriod] = useState<ChartPeriod>(initialPeriod)
  const [points, setPoints] = useState<PricePointRow[]>(initialPoints)
  const [internalLoading, setInternalLoading] = useState(false)
  // Skips the redundant fetch on mount — the server already sent
  // initialPoints for initialPeriod, so the effect below only needs to act
  // on subsequent tab switches, never on first render.
  const isFirstRender = useRef(true)

  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const period = isComparisonMode ? (controlledPeriod ?? initialPeriod) : internalPeriod
  const isLoading = isComparisonMode ? (controlledLoading ?? false) : internalLoading

  useEffect(() => {
    if (isComparisonMode) return
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    let cancelled = false
    setInternalLoading(true)
    getPriceHistoryAction(companyId, internalPeriod).then((result) => {
      if (!cancelled) {
        setPoints(result)
        setInternalLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [internalPeriod, companyId, isComparisonMode])

  function handlePeriodChange(value: ChartPeriod) {
    if (isComparisonMode) {
      onPeriodChange?.(value)
    } else {
      setInternalPeriod(value)
    }
  }

  const visibleSeries = (series ?? []).filter((s) => !hiddenSeries.has(s.companyId))
  const mergedRows = isComparisonMode ? mergeSeriesByDate(visibleSeries) : []
  const formatValue = valueFormatter ?? formatCurrencyCents

  function toggleHidden(companyIdToToggle: string) {
    setHiddenSeries((prev) => {
      const next = new Set(prev)
      if (next.has(companyIdToToggle)) next.delete(companyIdToToggle)
      else next.add(companyIdToToggle)
      return next
    })
  }

  const isEmpty = isComparisonMode ? mergedRows.length === 0 : points.length === 0
  const brushDataLength = isComparisonMode ? mergedRows.length : points.length

  return (
    <div className="space-y-3">
      <Tabs value={period} onValueChange={(value) => handlePeriodChange(value as ChartPeriod)}>
        <TabsList>
          {PERIODS.map((p) => (
            <TabsTrigger key={p.value} value={p.value}>
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {period === "1D" && (
        <p className="text-xs text-muted-foreground">
          Dados diários — mostrando o fechamento de hoje comparado ao fechamento anterior
          (sem cotação intradiária nesta fonte).
        </p>
      )}

      {isComparisonMode && series.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {series.map((s) => {
            const isHidden = hiddenSeries.has(s.companyId)
            return (
              <button
                key={s.companyId}
                type="button"
                onClick={() => toggleHidden(s.companyId)}
                onMouseEnter={() => setHighlightedId(s.companyId)}
                onMouseLeave={() => setHighlightedId(null)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs transition-opacity",
                  isHidden && "opacity-40"
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: isHidden ? "var(--muted-foreground)" : s.color }}
                />
                <span className={cn(isHidden && "line-through")}>{s.ticker}</span>
                {s.unavailableReason && (
                  <span className="text-muted-foreground">({s.unavailableReason})</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className={cn("h-72 w-full", isLoading && "opacity-50")}>
        {isEmpty ? (
          isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem histórico de preço disponível para este período.
            </div>
          )
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {isComparisonMode ? (
              <AreaChart data={mergedRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => dateFormatter.format(new Date(value))}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tickFormatter={(value: number) => formatValue(value)}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  className="text-xs fill-muted-foreground"
                />
                <Tooltip
                  content={
                    <ComparisonTooltip series={visibleSeries} formatValue={formatValue} />
                  }
                />
                {visibleSeries.map((s) => (
                  <Area
                    key={s.companyId}
                    type="monotone"
                    dataKey={s.companyId}
                    stroke={s.color}
                    strokeWidth={2}
                    strokeDasharray={s.dashed ? "6 4" : undefined}
                    strokeOpacity={highlightedId == null || highlightedId === s.companyId ? 1 : 0.25}
                    fill="transparent"
                    dot={false}
                    // true, not false: each company's own real points can be
                    // sparser than others sharing this merged date axis (the
                    // data provider silently returns coarser-than-daily
                    // granularity for some tickers on the current plan
                    // tier) — mergeSeriesByDate fills every date a company
                    // has no point for with null, and with connectNulls
                    // disabled a sparse series breaks into invisible
                    // fragments instead of one line across its own real
                    // points. This still never fabricates a value — it only
                    // draws a straight segment between two real known prices.
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
                {brushDataLength > 10 && (
                  <Brush
                    dataKey="date"
                    height={24}
                    travellerWidth={8}
                    stroke="var(--primary)"
                    tickFormatter={(value: string) => dateFormatter.format(new Date(value))}
                  />
                )}
              </AreaChart>
            ) : (
              <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => dateFormatter.format(new Date(value))}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tickFormatter={(value: number) => formatCurrencyCents(value)}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  className="text-xs fill-muted-foreground"
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="closeCents"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                />
                {brushDataLength > 10 && (
                  <Brush
                    dataKey="date"
                    height={24}
                    travellerWidth={8}
                    stroke="var(--primary)"
                    tickFormatter={(value: string) => dateFormatter.format(new Date(value))}
                  />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
