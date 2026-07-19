"use client"

import {
  ArrowDownUp,
  ChevronDown,
  ExternalLink,
  MoreHorizontal,
  Plus,
  Receipt,
  ScrollText,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AnimatedNumber } from "@/components/shared/AnimatedNumber"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import { SORT_LABELS, sortPositions, type SortKey } from "@/features/portfolio/sort-positions"
import type { PortfolioCategoryGroup, PortfolioPositionRow } from "@/features/portfolio/queries"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatPercent } from "@/utils/format"

export type PositionActionType = "buy" | "sell" | "income" | "adjustment" | "history"

interface CategorySectionProps {
  group: PortfolioCategoryGroup
  onAction: (type: PositionActionType, position: PortfolioPositionRow) => void
  onRemove: (position: PortfolioPositionRow) => void
}

function relativeTime(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.round(hours / 24)}d`
}

/// One collapsible card per AssetClass — the same shape regardless of
/// which category it renders, since every figure comes from the already-
/// computed PortfolioCategoryGroup. Adding a new category never means
/// touching this component.
export function CategorySection({ group, onAction, onRemove }: CategorySectionProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>("value")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const meta = getAssetCategoryMeta(group.category)
  const sorted = sortPositions(group.positions, sortKey, sortDirection)
  const isProfit = group.totals.profitCents >= 0
  const isDailyUp = group.totals.dailyChangePct >= 0

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("desc")
    }
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full flex-col gap-4 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            {meta.emoji}
          </span>
          <div>
            <p className="font-semibold">{meta.label}</p>
            <p className="text-xs text-muted-foreground">{group.totals.assetCount} ativo(s)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:flex sm:items-center sm:gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Valor total</p>
            <AnimatedNumber
              value={group.totals.currentValueCents}
              format={formatCurrencyCents}
              className="font-semibold tabular-nums"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rentabilidade</p>
            <AnimatedNumber
              value={group.totals.profitPct}
              format={formatPercent}
              className={cn("font-semibold tabular-nums", isProfit ? "text-gain" : "text-loss")}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Variação diária</p>
            <span className={cn("font-semibold tabular-nums", isDailyUp ? "text-gain" : "text-loss")}>
              {formatPercent(group.totals.dailyChangePct)}
            </span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">% carteira</p>
            <span className="font-semibold tabular-nums">
              {formatPercent(group.totals.allocationPct)}
            </span>
          </div>
        </div>

        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <CardContent className="border-t border-border pt-4">
          <div className="mb-3 flex flex-wrap gap-1">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <Button
                key={key}
                variant={sortKey === key ? "secondary" : "ghost"}
                size="sm"
                onClick={() => toggleSort(key)}
              >
                {SORT_LABELS[key]}
                <ArrowDownUp className="size-3" />
              </Button>
            ))}
          </div>

          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Preço médio</TableHead>
                  <TableHead className="text-right">Preço atual</TableHead>
                  <TableHead className="text-right">Valor investido</TableHead>
                  <TableHead className="text-right">Valor atual</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Rentabilidade</TableHead>
                  <TableHead className="text-right">Dividend Yield</TableHead>
                  <TableHead className="text-right">Participação</TableHead>
                  <TableHead className="text-right">Atualizado</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((position) => {
                  const rowIsProfit = position.profitCents >= 0
                  return (
                    <TableRow key={position.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <TickerBadge ticker={position.ticker} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{position.ticker}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {position.name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{position.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrencyCents(position.averagePriceCents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrencyCents(position.currentPriceCents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrencyCents(position.investedCents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrencyCents(position.currentValueCents)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          rowIsProfit ? "text-gain" : "text-loss"
                        )}
                      >
                        {formatCurrencyCents(position.profitCents)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          rowIsProfit ? "text-gain" : "text-loss"
                        )}
                      >
                        {formatPercent(position.profitPct)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(position.dividendYieldPct)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(position.allocationPct)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {relativeTime(position.lastUpdatedAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Ações para ${position.ticker}`}
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onAction("buy", position)}>
                              <Plus className="size-4" />
                              Comprar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAction("sell", position)}>
                              <Receipt className="size-4" />
                              Vender
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAction("income", position)}>
                              <Receipt className="size-4" />
                              Registrar provento
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAction("adjustment", position)}>
                              <ScrollText className="size-4" />
                              Ajuste de posição
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAction("history", position)}>
                              <ScrollText className="size-4" />
                              Editar operações
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/empresa/${position.ticker}`)}
                            >
                              <ExternalLink className="size-4" />
                              Abrir página do ativo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => onRemove(position)}>
                              <Trash2 className="size-4" />
                              Excluir ativo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
