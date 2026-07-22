"use client"

import { useMemo } from "react"
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ASSET_COLORS } from "@/features/comparator/colors"
import type { MonthlyDividendPoint } from "@/features/portfolio/analytics"
import type { AllocationSlice } from "@/features/portfolio/insights"
import { formatCurrencyCents } from "@/utils/format"

const MUTED_SLICE_COLOR = "var(--muted-foreground)"
const MAX_SLICES = 7

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
}

/// Folds everything past the 7th slice into "Outros" rather than rendering
/// an unreadable pie with a dozen slivers — same principle the dataviz
/// skill calls for with a high-cardinality categorical series.
function capSlices(slices: AllocationSlice[]): AllocationSlice[] {
  if (slices.length <= MAX_SLICES) return slices
  const top = slices.slice(0, MAX_SLICES)
  const rest = slices.slice(MAX_SLICES)
  return [
    ...top,
    {
      label: "Outros",
      valueCents: rest.reduce((sum, s) => sum + s.valueCents, 0),
      pct: rest.reduce((sum, s) => sum + s.pct, 0),
    },
  ]
}

function AllocationPie({ title, slices }: { title: string; slices: AllocationSlice[] }) {
  const capped = useMemo(() => capSlices(slices), [slices])
  if (capped.length === 0) return null

  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={capped}
              dataKey="valueCents"
              nameKey="label"
              innerRadius={44}
              outerRadius={74}
              paddingAngle={2}
              strokeWidth={2}
              stroke="var(--card)"
            >
              {capped.map((slice, index) => (
                <Cell
                  key={slice.label}
                  fill={slice.label === "Outros" ? MUTED_SLICE_COLOR : ASSET_COLORS[index % ASSET_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatCurrencyCents(Number(value)), String(name)]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function DividendsBar({ points }: { points: MonthlyDividendPoint[] }) {
  const hasAny = points.some((p) => p.totalCents > 0)
  if (!hasAny) return null

  return (
    <div>
      <p className="mb-2 text-sm font-medium">Dividendos por mês</p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              className="text-xs fill-muted-foreground"
              tickFormatter={(value: string) => value.slice(5)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(value: number) => formatCurrencyCents(value)}
              className="text-xs fill-muted-foreground"
            />
            <Tooltip
              formatter={(value) => [formatCurrencyCents(Number(value)), "Dividendos"]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Bar dataKey="totalCents" fill="var(--gain)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface AllocationChartsProps {
  byCategory: AllocationSlice[]
  bySector: AllocationSlice[]
  byAsset: AllocationSlice[]
  monthlyDividends: MonthlyDividendPoint[]
}

/// Alocação inteligente — reuses computeCategoryAllocation/
/// computeSectorAllocation/computeAssetAllocation (insights.ts) and
/// getMonthlyDividendsHistory (analytics.ts) exactly as computed; this
/// component only shapes them into recharts pies/bar.
export function AllocationCharts({ byCategory, bySector, byAsset, monthlyDividends }: AllocationChartsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alocação inteligente</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <AllocationPie title="Distribuição por categoria" slices={byCategory} />
        <AllocationPie title="Distribuição por setor" slices={bySector} />
        <AllocationPie title="Distribuição por ativo" slices={byAsset} />
        <DividendsBar points={monthlyDividends} />
      </CardContent>
    </Card>
  )
}
