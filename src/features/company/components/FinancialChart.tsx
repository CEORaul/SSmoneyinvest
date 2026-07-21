"use client"

import { useEffect, useRef, useState } from "react"
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getPriceHistoryAction, type PricePointRow } from "@/features/company/actions"
import type { ChartPeriod } from "@/features/company/queries"
import { cn } from "@/lib/utils"
import { formatCompactNumber, formatCurrencyCents } from "@/utils/format"

interface FinancialChartProps {
  companyId: string
  initialPeriod: ChartPeriod
  initialPoints: PricePointRow[]
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

/// The first Recharts usage in this app — recharts@3.9.2 was already an
/// installed dependency, just unused until now. "1D" is deliberately not a
/// smooth intraday curve: PriceHistoryPoint is daily-close-only (BRAPI's
/// current plan doesn't expose intraday bars), so "1D" renders the two most
/// recent daily closes with an inline note rather than fabricating minutes-
/// level detail that doesn't exist in the data.
export function FinancialChart({ companyId, initialPeriod, initialPoints }: FinancialChartProps) {
  const [period, setPeriod] = useState<ChartPeriod>(initialPeriod)
  const [points, setPoints] = useState<PricePointRow[]>(initialPoints)
  const [isLoading, setIsLoading] = useState(false)
  // Skips the redundant fetch on mount — the server already sent
  // initialPoints for initialPeriod, so the effect below only needs to act
  // on subsequent tab switches, never on first render.
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    let cancelled = false
    setIsLoading(true)
    getPriceHistoryAction(companyId, period).then((result) => {
      if (!cancelled) {
        setPoints(result)
        setIsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [period, companyId])

  return (
    <div className="space-y-3">
      <Tabs value={period} onValueChange={(value) => setPeriod(value as ChartPeriod)}>
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

      <div className={cn("h-72 w-full", isLoading && "opacity-50")}>
        {points.length === 0 ? (
          isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem histórico de preço disponível para este período.
            </div>
          )
        ) : (
          <ResponsiveContainer width="100%" height="100%">
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
              {points.length > 10 && (
                <Brush
                  dataKey="date"
                  height={24}
                  travellerWidth={8}
                  stroke="var(--primary)"
                  tickFormatter={(value: string) => dateFormatter.format(new Date(value))}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
