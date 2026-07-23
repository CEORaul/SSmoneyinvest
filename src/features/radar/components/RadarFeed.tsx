"use client"

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  Layers,
  ShieldAlert,
  Split,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { groupFeedByBucket } from "@/features/radar/insights"
import type { RadarFeedCategory, RadarFeedItem, RadarFeedScope } from "@/features/radar/types"
import { cn } from "@/lib/utils"
import { formatDate } from "@/utils/format"

const TYPE_META: Record<RadarFeedItem["type"], { icon: typeof ArrowUpCircle; tone: "gain" | "loss" | "neutral" }> = {
  PRICE_UP: { icon: TrendingUp, tone: "gain" },
  PRICE_DOWN: { icon: TrendingDown, tone: "loss" },
  BUY: { icon: ArrowUpCircle, tone: "gain" },
  SELL: { icon: ArrowDownCircle, tone: "loss" },
  DIVIDEND: { icon: Coins, tone: "gain" },
  JCP: { icon: Coins, tone: "gain" },
  BONUS: { icon: Layers, tone: "neutral" },
  SPLIT: { icon: Split, tone: "neutral" },
  REVERSE_SPLIT: { icon: Split, tone: "neutral" },
  ALERT: { icon: ShieldAlert, tone: "neutral" },
}

type PeriodFilter = "todos" | "hoje" | "ontem" | "7d" | "30d"
const PERIOD_LABELS: Record<PeriodFilter, string> = {
  todos: "Todos",
  hoje: "Hoje",
  ontem: "Ontem",
  "7d": "7 dias",
  "30d": "30 dias",
}

type CategoryFilter = "TODOS" | RadarFeedCategory
const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  TODOS: "Todos",
  DIVIDENDOS: "Dividendos",
  RESULTADOS: "Resultados",
  ALERTAS: "Alertas",
  NOTICIAS: "Notícias",
  EVENTOS: "Eventos",
}

type ScopeFilter = "TODOS" | RadarFeedScope
const SCOPE_LABELS: Record<ScopeFilter, string> = {
  TODOS: "Tudo",
  carteira: "Somente carteira",
  favorito: "Somente favoritos",
}

function isWithinPeriod(dateIso: string, period: PeriodFilter): boolean {
  if (period === "todos") return true
  const date = new Date(dateIso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (period === "hoje") return date >= startOfToday
  if (period === "ontem") {
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    return date >= startOfYesterday && date < startOfToday
  }
  if (period === "7d") {
    const sevenDaysAgo = new Date(startOfToday)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return date >= sevenDaysAgo
  }
  // 30d
  const thirtyDaysAgo = new Date(startOfToday)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return date >= thirtyDaysAgo
}

interface RadarFeedProps {
  items: RadarFeedItem[]
}

/// Unified Feed de Eventos (point 2) + Timeline (point 10) — the spec
/// describes near-identical chronological groupings over the same
/// Transaction/price-move/alert data, so this is the one component both
/// read from instead of two parallel renderings of the same items.
export function RadarFeed({ items }: RadarFeedProps) {
  const [period, setPeriod] = useState<PeriodFilter>("todos")
  const [category, setCategory] = useState<CategoryFilter>("TODOS")
  const [scope, setScope] = useState<ScopeFilter>("TODOS")

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!isWithinPeriod(item.date, period)) return false
      if (category !== "TODOS" && item.category !== category) return false
      if (scope !== "TODOS" && item.scope !== scope) return false
      return true
    })
  }, [items, period, category, scope])

  const buckets = useMemo(() => groupFeedByBucket(filtered), [filtered])

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>Feed e Linha do Tempo</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Período</span>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {PERIOD_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Categoria</span>
            <Select value={category} onValueChange={(v) => setCategory(v as CategoryFilter)}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Escopo</span>
            <Select value={scope} onValueChange={(v) => setScope(v as ScopeFilter)}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SCOPE_LABELS) as ScopeFilter[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SCOPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {buckets.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum evento neste filtro.</p>
        ) : (
          <div className="space-y-6">
            {buckets.map((bucket) => (
              <div key={bucket.label}>
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {bucket.label}
                </p>
                <div className="space-y-1">
                  {bucket.items.map((item) => {
                    const meta = TYPE_META[item.type]
                    const Icon = meta.icon
                    const content = (
                      <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60">
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            meta.tone === "gain" && "text-gain",
                            meta.tone === "loss" && "text-loss",
                            meta.tone === "neutral" && "text-muted-foreground"
                          )}
                        />
                        {item.ticker && <TickerBadge ticker={item.ticker} logoUrl={item.logoUrl} size="sm" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(item.date)}</span>
                      </div>
                    )
                    return item.href ? (
                      <Link key={item.id} href={item.href}>
                        {content}
                      </Link>
                    ) : (
                      <div key={item.id}>{content}</div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
