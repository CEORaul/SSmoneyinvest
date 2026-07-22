"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPatrimonyHistoryAction } from "@/features/portfolio/analytics-actions"
import type { PatrimonyPeriod, PatrimonyPoint } from "@/features/portfolio/analytics"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatDate, formatPercent } from "@/utils/format"

const PERIODS: PatrimonyPeriod[] = ["1M", "3M", "6M", "1A", "5A", "MAX"]
const PERIOD_LABELS: Record<PatrimonyPeriod, string> = {
  "1M": "1M",
  "3M": "3M",
  "6M": "6M",
  "1A": "1A",
  "5A": "5A",
  MAX: "Máximo",
}

type ViewMode = "patrimonio" | "rentabilidade"

interface ChartPoint {
  date: string
  valueCents: number
  returnPct: number
}

function toChartPoints(points: PatrimonyPoint[]): ChartPoint[] {
  return points.map((p) => ({
    date: p.date,
    valueCents: p.valueCents,
    returnPct: p.investedCents > 0 ? ((p.valueCents - p.investedCents) / p.investedCents) * 100 : 0,
  }))
}

interface PatrimonyEvolutionSectionProps {
  initialPoints: PatrimonyPoint[]
}

/// "Evolução da carteira" — patrimônio ao longo do tempo and rentabilidade
/// acumulada are the same underlying replay (getPatrimonyHistory), just two
/// view modes over one fetch per period switch, not two separate charts.
export function PatrimonyEvolutionSection({ initialPoints }: PatrimonyEvolutionSectionProps) {
  const [period, setPeriod] = useState<PatrimonyPeriod>("6M")
  const [view, setView] = useState<ViewMode>("patrimonio")
  const [points, setPoints] = useState<ChartPoint[]>(() => toChartPoints(initialPoints))
  const [isPending, startTransition] = useTransition()
  const isFirstRender = useRef(true)

  // initialPoints is always the "6M" fetch the server already did — only
  // re-fetch when the user actually picks a different period, never on
  // mount (that would just re-request data the page already has).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    startTransition(async () => {
      const result = await getPatrimonyHistoryAction(period)
      setPoints(toChartPoints(result))
    })
  }, [period])

  if (points.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Evolução da carteira</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            <Button
              variant={view === "patrimonio" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("patrimonio")}
            >
              Patrimônio
            </Button>
            <Button
              variant={view === "rentabilidade" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("rentabilidade")}
            >
              Rentabilidade
            </Button>
          </div>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <Button
                key={p}
                variant={period === p ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("h-72 w-full transition-opacity", isPending && "opacity-60")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="patrimonyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: string) => formatDate(value).slice(0, 5)}
                className="text-xs fill-muted-foreground"
                minTickGap={40}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(value: number) =>
                  view === "patrimonio" ? formatCurrencyCents(value) : formatPercent(value)
                }
                className="text-xs fill-muted-foreground"
              />
              <Tooltip
                labelFormatter={(value) => formatDate(String(value))}
                formatter={(value) => [
                  view === "patrimonio" ? formatCurrencyCents(Number(value)) : formatPercent(Number(value)),
                  view === "patrimonio" ? "Patrimônio" : "Rentabilidade",
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey={view === "patrimonio" ? "valueCents" : "returnPct"}
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#patrimonyFill)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
