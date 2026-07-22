"use client"

import {
  ArrowDownUp,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  GitCompare,
  Heart,
  MoreHorizontal,
  Plus,
  Receipt,
  ScrollText,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Fragment, useState } from "react"
import { toast } from "sonner"

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AnimatedNumber } from "@/components/shared/AnimatedNumber"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { toggleFavoriteAction } from "@/features/company/actions"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import { ExpandedPositionDetail } from "@/features/portfolio/components/ExpandedPositionDetail"
import { Sparkline, type SparklinePoint } from "@/features/portfolio/components/Sparkline"
import { SORT_LABELS, sortPositions, type SortKey } from "@/features/portfolio/sort-positions"
import type { PortfolioCategoryGroup, PortfolioPositionRow } from "@/features/portfolio/queries"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatPercent, formatRelativeTime } from "@/utils/format"

export type PositionActionType = "buy" | "sell" | "income" | "adjustment" | "history"

interface CategorySectionProps {
  group: PortfolioCategoryGroup
  onAction: (type: PositionActionType, position: PortfolioPositionRow) => void
  onRemove: (position: PortfolioPositionRow) => void
  /// When set (the global filter bar's "Ordenar" is active), supersedes
  /// this card's own per-card sort buttons — one sort order across every
  /// category at once instead of each card sorting independently.
  sortOverride?: { key: SortKey; direction: "asc" | "desc" }
  priceHistories: Map<string, SparklinePoint[]>
  monthlyChangeByCompany: Map<string, number>
}

/// One collapsible card per AssetClass — the same shape regardless of
/// which category it renders, since every figure comes from the already-
/// computed PortfolioCategoryGroup. Adding a new category never means
/// touching this component.
export function CategorySection({
  group,
  onAction,
  onRemove,
  sortOverride,
  priceHistories,
  monthlyChangeByCompany,
}: CategorySectionProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [localSortKey, setLocalSortKey] = useState<SortKey>("value")
  const [localSortDirection, setLocalSortDirection] = useState<"asc" | "desc">("desc")
  const [favoritingIds, setFavoritingIds] = useState<Set<string>>(new Set())
  const [expandedPositionId, setExpandedPositionId] = useState<string | null>(null)

  const sortKey = sortOverride?.key ?? localSortKey
  const sortDirection = sortOverride?.direction ?? localSortDirection

  const meta = getAssetCategoryMeta(group.category)
  const sorted = sortPositions(group.positions, sortKey, sortDirection)
  const isProfit = group.totals.profitCents >= 0
  const isDailyUp = group.totals.dailyChangePct >= 0

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setLocalSortDirection((current) => (current === "asc" ? "desc" : "asc"))
    } else {
      setLocalSortKey(key)
      setLocalSortDirection("desc")
    }
  }

  async function handleFavorite(position: PortfolioPositionRow) {
    setFavoritingIds((current) => new Set(current).add(position.id))
    const result = await toggleFavoriteAction(position.companyId, position.ticker)
    setFavoritingIds((current) => {
      const next = new Set(current)
      next.delete(position.id)
      return next
    })
    if (result.ok) {
      toast.success(result.favorited ? `${position.ticker} adicionado aos favoritos.` : `${position.ticker} removido dos favoritos.`)
    } else {
      toast.error(result.error ?? "Não foi possível atualizar os favoritos.")
    }
  }

  function handleCopyTicker(ticker: string) {
    navigator.clipboard.writeText(ticker)
    toast.success(`${ticker} copiado.`)
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

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-6">
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
            <p className="text-xs text-muted-foreground">DY médio</p>
            <span className="font-semibold tabular-nums">{formatPercent(group.totals.avgDividendYieldPct)}</span>
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
          <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl bg-muted/40 p-3 text-sm sm:grid-cols-4 lg:grid-cols-8">
            <div>
              <p className="text-xs text-muted-foreground">Ativos</p>
              <p className="font-medium tabular-nums">{group.totals.assetCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor investido</p>
              <p className="font-medium tabular-nums">{formatCurrencyCents(group.totals.investedCents)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor atual</p>
              <p className="font-medium tabular-nums">{formatCurrencyCents(group.totals.currentValueCents)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lucro</p>
              <p className={cn("font-medium tabular-nums", isProfit ? "text-gain" : "text-loss")}>
                {formatCurrencyCents(group.totals.profitCents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rentabilidade</p>
              <p className={cn("font-medium tabular-nums", isProfit ? "text-gain" : "text-loss")}>
                {formatPercent(group.totals.profitPct)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">DY médio</p>
              <p className="font-medium tabular-nums">{formatPercent(group.totals.avgDividendYieldPct)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Preço médio geral</p>
              <p className="font-medium tabular-nums">{formatCurrencyCents(group.totals.avgPurchasePriceCents)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Participação</p>
              <p className="font-medium tabular-nums">{formatPercent(group.totals.allocationPct)}</p>
            </div>
          </div>

          {!sortOverride && (
            <div className="mb-3 flex flex-wrap gap-1">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <Button
                  key={key}
                  variant={localSortKey === key ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => toggleSort(key)}
                >
                  {SORT_LABELS[key]}
                  <ArrowDownUp className="size-3" />
                </Button>
              ))}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Ativo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Gráfico</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Preço médio</TableHead>
                  <TableHead className="text-right">Preço atual</TableHead>
                  <TableHead className="text-right">Variação diária</TableHead>
                  <TableHead className="text-right">Variação mensal</TableHead>
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
                  const isDailyGain = position.priceChangePct >= 0
                  const monthlyChangePct = monthlyChangeByCompany.get(position.companyId)
                  const points = priceHistories.get(position.companyId) ?? []
                  const isRowExpanded = expandedPositionId === position.id
                  return (
                    <Fragment key={position.id}>
                      <TableRow>
                        <TableCell className="p-0 text-center">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={isRowExpanded ? "Recolher detalhes" : "Expandir detalhes"}
                            onClick={() => setExpandedPositionId(isRowExpanded ? null : position.id)}
                          >
                            <ChevronRight className={cn("size-4 transition-transform", isRowExpanded && "rotate-90")} />
                          </Button>
                        </TableCell>
                        <TableCell className="p-0">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Link
                                  href={`/empresa/${position.ticker}`}
                                  className="group flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-accent/60"
                                />
                              }
                            >
                              <TickerBadge ticker={position.ticker} logoUrl={position.logoUrl} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium transition-colors duration-200 group-hover:text-primary">
                                  {position.ticker}
                                </p>
                                <p className="truncate text-xs text-muted-foreground transition-colors duration-200 group-hover:text-primary">
                                  {position.name}
                                </p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Abrir página completa</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{position.sector ?? "—"}</TableCell>
                        <TableCell>
                          <Sparkline points={points} isGain={isDailyGain} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{position.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrencyCents(position.averagePriceCents)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrencyCents(position.currentPriceCents)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            isDailyGain ? "text-gain" : "text-loss"
                          )}
                        >
                          <span className="inline-flex items-center justify-end gap-1">
                            {isDailyGain ? (
                              <TrendingUp className="size-3.5" />
                            ) : (
                              <TrendingDown className="size-3.5" />
                            )}
                            {formatPercent(position.priceChangePct)}
                          </span>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            monthlyChangePct == null
                              ? "text-muted-foreground"
                              : monthlyChangePct >= 0
                                ? "text-gain"
                                : "text-loss"
                          )}
                        >
                          {monthlyChangePct == null ? "—" : formatPercent(monthlyChangePct)}
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
                        {/* "há Xs" necessarily reads differently between the
                            server render and client hydration a moment later
                            — suppressHydrationWarning is React's documented
                            escape hatch for exactly this class of value. */}
                        <TableCell
                          className="text-right text-xs text-muted-foreground"
                          suppressHydrationWarning
                        >
                          {formatRelativeTime(position.lastUpdatedAt)}
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
                              <DropdownMenuItem
                                onClick={() => router.push(`/comparar?tickers=${position.ticker}`)}
                              >
                                <GitCompare className="size-4" />
                                Comparar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={favoritingIds.has(position.id)}
                                onClick={() => handleFavorite(position)}
                              >
                                <Heart className="size-4" />
                                Adicionar aos favoritos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyTicker(position.ticker)}>
                                <Copy className="size-4" />
                                Copiar ticker
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
                      {isRowExpanded && (
                        <TableRow key={`${position.id}-detail`}>
                          <TableCell colSpan={16} className="bg-muted/20 p-0">
                            <ExpandedPositionDetail
                              companyId={position.companyId}
                              ticker={position.ticker}
                              averagePriceCents={position.averagePriceCents}
                              unrealizedProfitCents={position.profitCents}
                              lastUpdatedAt={position.lastUpdatedAt}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
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
