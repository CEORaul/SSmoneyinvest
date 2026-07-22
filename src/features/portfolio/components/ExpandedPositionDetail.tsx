"use client"

import { ExternalLink, Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import type { ChartPeriod } from "@/features/company/queries"
import { getPriceHistoryForCompaniesAction } from "@/features/comparator/actions"
import { getPositionTransactionsAction, type TransactionRow } from "@/features/portfolio/actions"
import { Sparkline } from "@/features/portfolio/components/Sparkline"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatDate } from "@/utils/format"

const PERIODS: ChartPeriod[] = ["1D", "5D", "1M", "6M", "1A"]

interface ExpandedPositionDetailProps {
  companyId: string
  ticker: string
  averagePriceCents: number
  unrealizedProfitCents: number
  lastUpdatedAt: Date
}

function TransactionList({ title, rows }: { title: string; rows: TransactionRow[] }) {
  if (rows.length === 0) return null
  const shown = rows.slice(0, 5)
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="space-y-1">
        {shown.map((row) => (
          <div key={row.id} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{formatDate(row.date)}</span>
            <span className="tabular-nums">{row.quantity} un.</span>
            <span className="font-medium tabular-nums">{formatCurrencyCents(Number(row.totalCents))}</span>
          </div>
        ))}
        {rows.length > shown.length && (
          <p className="text-xs text-muted-foreground">+{rows.length - shown.length} mais</p>
        )}
      </div>
    </div>
  )
}

/// Inline expand-in-place detail — no navigation away. Lazy-fetches the
/// transaction ledger (getPositionTransactionsAction, already built for
/// TransactionHistoryDialog) on first expand only, and reuses the
/// comparator's batched price-history action for the period-switchable
/// chart rather than introducing a third way to fetch price history.
export function ExpandedPositionDetail({
  companyId,
  ticker,
  averagePriceCents,
  unrealizedProfitCents,
  lastUpdatedAt,
}: ExpandedPositionDetailProps) {
  const [transactions, setTransactions] = useState<TransactionRow[] | null>(null)
  const [period, setPeriod] = useState<ChartPeriod>("1M")
  const [points, setPoints] = useState<{ date: string; closeCents: number }[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getPositionTransactionsAction(companyId).then(setTransactions)
  }, [companyId])

  useEffect(() => {
    startTransition(async () => {
      const result = await getPriceHistoryForCompaniesAction([companyId], period)
      setPoints(result[0]?.points ?? [])
    })
  }, [companyId, period])

  if (transactions === null) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  const buys = transactions.filter((t) => t.type === "BUY")
  const sells = transactions.filter((t) => t.type === "SELL")
  const income = transactions.filter((t) => t.type === "DIVIDEND" || t.type === "JCP")
  const adjustments = transactions.filter((t) =>
    ["BONUS", "SPLIT", "REVERSE_SPLIT"].includes(t.type)
  )
  const realizedProfitCents = sells.reduce(
    (sum, t) => sum + (t.realizedProfitCents ? Number(t.realizedProfitCents) : 0),
    0
  )
  const isGain = points.length > 1 ? points[points.length - 1].closeCents >= points[0].closeCents : true

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p}
              variant={period === p ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {p}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/empresa/${ticker}`} />}
          nativeButton={false}
        >
          <ExternalLink className="size-4" />
          Ver página completa
        </Button>
      </div>

      <div className={cn("h-24 w-full max-w-md", isPending && "opacity-50")}>
        <Sparkline points={points} isGain={isGain} />
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Preço médio</p>
          <p className="font-medium tabular-nums">{formatCurrencyCents(averagePriceCents)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Lucro realizado</p>
          <p className={cn("font-medium tabular-nums", realizedProfitCents >= 0 ? "text-gain" : "text-loss")}>
            {formatCurrencyCents(realizedProfitCents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Lucro não realizado</p>
          <p className={cn("font-medium tabular-nums", unrealizedProfitCents >= 0 ? "text-gain" : "text-loss")}>
            {formatCurrencyCents(unrealizedProfitCents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Última atualização</p>
          <p className="font-medium">{formatDate(lastUpdatedAt.toISOString())}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <TransactionList title="Histórico de compras" rows={buys} />
        <TransactionList title="Histórico de vendas" rows={sells} />
        <TransactionList title="Dividendos e JSCP" rows={income} />
        <TransactionList title="Bonificações/Desdobramentos" rows={adjustments} />
      </div>

      {buys.length === 0 && sells.length === 0 && income.length === 0 && adjustments.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma operação registrada ainda.</p>
      )}
    </div>
  )
}
