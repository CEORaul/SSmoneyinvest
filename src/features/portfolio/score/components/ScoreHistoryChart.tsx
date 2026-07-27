"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ScoreHistoryPoint } from "@/features/portfolio/score/snapshots"
import { formatDate } from "@/utils/format"

interface ScoreHistoryChartProps {
  points: ScoreHistoryPoint[]
}

/// There is no backfilled history (see PortfolioScoreSnapshot's doc comment
/// in schema.prisma) — the chart honestly shows a message instead of a line
/// until at least 2 real snapshots exist, exactly matching the spec's
/// "mesmo que inicialmente só exista um ponto."
export function ScoreHistoryChart({ points }: ScoreHistoryChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução do Score</CardTitle>
      </CardHeader>
      <CardContent>
        {points.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            {points.length === 1
              ? `Seu primeiro registro de Score foi hoje: ${points[0].score}/100. O histórico aparecerá aqui conforme novos registros forem feitos, um por dia.`
              : "Ainda não há registros de Score para exibir."}
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
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
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={32} className="text-xs fill-muted-foreground" />
                <Tooltip
                  labelFormatter={(value) => formatDate(String(value))}
                  formatter={(value) => [`${Number(value)}/100`, "Score"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} fill="url(#scoreFill)" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
