"use client"

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  Layers,
  Scissors,
  Split,
} from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TickerBadge } from "@/components/shared/TickerBadge"
import type { TimelineEvent } from "@/features/portfolio/analytics"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatDate } from "@/utils/format"

const TYPE_META: Record<
  TimelineEvent["type"],
  { label: string; icon: typeof ArrowUpCircle; tone: "gain" | "loss" | "neutral" }
> = {
  BUY: { label: "Compra", icon: ArrowUpCircle, tone: "gain" },
  SELL: { label: "Venda", icon: ArrowDownCircle, tone: "loss" },
  DIVIDEND: { label: "Dividendo", icon: Coins, tone: "gain" },
  JCP: { label: "JSCP", icon: Coins, tone: "gain" },
  BONUS: { label: "Bonificação", icon: Layers, tone: "neutral" },
  SPLIT: { label: "Desdobramento", icon: Split, tone: "neutral" },
  REVERSE_SPLIT: { label: "Agrupamento", icon: Scissors, tone: "neutral" },
}

interface TimelineSectionProps {
  events: TimelineEvent[]
}

/// Chronological feed of every event across the whole portfolio — reuses
/// TimelineEvent exactly as getPortfolioTimeline (analytics.ts) produced it,
/// no client-side re-derivation of any figure.
export function TimelineSection({ events }: TimelineSectionProps) {
  if (events.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha do tempo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[28rem] space-y-1 overflow-y-auto">
          {events.map((event) => {
            const meta = TYPE_META[event.type]
            const Icon = meta.icon
            return (
              <Link
                key={event.id}
                href={`/empresa/${event.ticker}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60"
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    meta.tone === "gain" && "text-gain",
                    meta.tone === "loss" && "text-loss",
                    meta.tone === "neutral" && "text-muted-foreground"
                  )}
                />
                <TickerBadge ticker={event.ticker} logoUrl={event.logoUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {meta.label} · {event.ticker}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {event.quantity} un. · {formatDate(event.date)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-medium tabular-nums",
                    meta.tone === "gain" && "text-gain",
                    meta.tone === "loss" && "text-loss"
                  )}
                >
                  {formatCurrencyCents(event.totalCents)}
                </span>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
