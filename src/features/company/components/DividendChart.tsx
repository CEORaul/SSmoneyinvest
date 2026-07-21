"use client"

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { DividendPaymentDTO } from "@/features/company/queries"

interface DividendChartProps {
  payments: DividendPaymentDTO[]
}

interface YearlyTotal {
  year: string
  total: number
}

function toYearlyTotals(payments: DividendPaymentDTO[]): YearlyTotal[] {
  const byYear = new Map<string, number>()
  for (const payment of payments) {
    const year = payment.exDate.getFullYear().toString()
    byYear.set(year, (byYear.get(year) ?? 0) + payment.amountPerShare)
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, total]) => ({ year, total }))
}

export function DividendChart({ payments }: DividendChartProps) {
  const data = toYearlyTotals(payments)
  if (data.length === 0) return null

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            className="text-xs fill-muted-foreground"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(value: number) => `R$${value.toFixed(2)}`}
            className="text-xs fill-muted-foreground"
          />
          <Tooltip
            formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Total por cota/ação"]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
          />
          <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
