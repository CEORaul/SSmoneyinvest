"use client"

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ASSET_COLORS } from "@/features/comparator/colors"
import type { PortfolioPositionRow } from "@/features/portfolio/queries"

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
}

interface TopPositionsBarChartProps {
  positions: PortfolioPositionRow[]
}

/// Separate from AllocationCharts' "Distribuição por ativo" pie — the spec
/// explicitly asks for a dedicated "Top 10 posições" chart, and a
/// horizontal bar ranks the concentration story more clearly than a pie
/// once there are more than a handful of positions.
export function TopPositionsBarChart({ positions }: TopPositionsBarChartProps) {
  const top10 = [...positions].sort((a, b) => b.allocationPct - a.allocationPct).slice(0, 10)
  if (top10.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 posições</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `${value.toFixed(0)}%`}
                className="text-xs fill-muted-foreground"
              />
              <YAxis type="category" dataKey="ticker" tickLine={false} axisLine={false} width={64} className="text-xs fill-muted-foreground" />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, "Alocação"]} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="allocationPct" radius={[0, 4, 4, 0]}>
                {top10.map((position, index) => (
                  <Cell key={position.id} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
