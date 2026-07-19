"use client"

import {
  ArrowDownUp,
  MoreHorizontal,
  Plus,
  Receipt,
  ScrollText,
  Search,
  Trash2,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { AdjustmentDialog } from "@/features/portfolio/components/AdjustmentDialog"
import { IncomeDialog } from "@/features/portfolio/components/IncomeDialog"
import { TradeDialog } from "@/features/portfolio/components/TradeDialog"
import { TransactionHistoryDialog } from "@/features/portfolio/components/TransactionHistoryDialog"
import { removePositionAction } from "@/features/portfolio/actions"
import type { PortfolioPositionRow } from "@/features/portfolio/queries"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatPercent } from "@/utils/format"

interface PositionsTableProps {
  positions: PortfolioPositionRow[]
}

type SortKey = "ticker" | "value" | "profit" | "dividends" | "allocation"
type ActionType = "buy" | "sell" | "income" | "adjustment" | "history"

const SORT_LABELS: Record<SortKey, string> = {
  ticker: "Ticker/Empresa",
  value: "Valor",
  profit: "Rentabilidade",
  dividends: "Dividendos",
  allocation: "Participação",
}

function sortPositions(
  positions: PortfolioPositionRow[],
  key: SortKey,
  direction: "asc" | "desc"
): PortfolioPositionRow[] {
  const sorted = [...positions].sort((a, b) => {
    switch (key) {
      case "ticker":
        return a.ticker.localeCompare(b.ticker)
      case "value":
        return a.currentValueCents - b.currentValueCents
      case "profit":
        return a.profitPct - b.profitPct
      case "dividends":
        return a.dividendsReceivedCents - b.dividendsReceivedCents
      case "allocation":
        return a.allocationPct - b.allocationPct
    }
  })
  return direction === "asc" ? sorted : sorted.reverse()
}

export function PositionsTable({ positions }: PositionsTableProps) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("value")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [removingPosition, setRemovingPosition] = useState<PortfolioPositionRow | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [activeAction, setActiveAction] = useState<{
    type: ActionType
    position: PortfolioPositionRow
  } | null>(null)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const base = query
      ? positions.filter(
          (p) => p.ticker.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)
        )
      : positions
    return sortPositions(base, sortKey, sortDirection)
  }, [positions, search, sortKey, sortDirection])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("desc")
    }
  }

  async function handleRemove() {
    if (!removingPosition) return
    setIsRemoving(true)
    const result = await removePositionAction(removingPosition.companyId)
    setIsRemoving(false)

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível remover o ativo")
      return
    }

    toast.success(`${removingPosition.ticker} removido da carteira`)
    setRemovingPosition(null)
  }

  const activeCompany = activeAction
    ? {
        id: activeAction.position.companyId,
        ticker: activeAction.position.ticker,
        name: activeAction.position.name,
        logoUrl: activeAction.position.logoUrl,
      }
    : null

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por ticker ou nome"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1">
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
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">Preço médio</TableHead>
              <TableHead className="text-right">Preço atual</TableHead>
              <TableHead className="text-right">Valor atual</TableHead>
              <TableHead className="text-right">Lucro/Prejuízo</TableHead>
              <TableHead className="text-right">Dividend Yield</TableHead>
              <TableHead className="text-right">Participação</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  Nenhum ativo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((position) => {
                const isProfit = position.profitCents >= 0

                return (
                  <TableRow key={position.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <TickerBadge ticker={position.ticker} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{position.ticker}</p>
                          <p className="truncate text-xs text-muted-foreground">{position.name}</p>
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
                      <p>{formatCurrencyCents(position.currentValueCents)}</p>
                      <p className="text-xs text-muted-foreground">
                        Investido: {formatCurrencyCents(position.investedCents)}
                      </p>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        isProfit ? "text-gain" : "text-loss"
                      )}
                    >
                      <p>{formatCurrencyCents(position.profitCents)}</p>
                      <p className="text-xs">{formatPercent(position.profitPct)}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <p>{formatPercent(position.dividendYieldPct)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrencyCents(position.dividendsReceivedCents)}
                      </p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(position.allocationPct)}
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
                          <DropdownMenuItem
                            onClick={() => setActiveAction({ type: "buy", position })}
                          >
                            <Plus className="size-4" />
                            Comprar mais
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setActiveAction({ type: "sell", position })}
                          >
                            <Receipt className="size-4" />
                            Vender
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setActiveAction({ type: "income", position })}
                          >
                            <Receipt className="size-4" />
                            Registrar provento
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setActiveAction({ type: "adjustment", position })}
                          >
                            <ScrollText className="size-4" />
                            Ajuste de posição
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setActiveAction({ type: "history", position })}
                          >
                            <ScrollText className="size-4" />
                            Ver histórico
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setRemovingPosition(position)}
                          >
                            <Trash2 className="size-4" />
                            Remover ativo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {activeCompany && (
        <>
          <TradeDialog
            type="BUY"
            company={activeCompany}
            ownedQuantity={activeAction?.position.quantity}
            open={activeAction?.type === "buy"}
            onOpenChange={(open) => !open && setActiveAction(null)}
          />
          <TradeDialog
            type="SELL"
            company={activeCompany}
            ownedQuantity={activeAction?.position.quantity}
            open={activeAction?.type === "sell"}
            onOpenChange={(open) => !open && setActiveAction(null)}
          />
          <IncomeDialog
            companyId={activeCompany.id}
            ticker={activeCompany.ticker}
            open={activeAction?.type === "income"}
            onOpenChange={(open) => !open && setActiveAction(null)}
          />
          <AdjustmentDialog
            companyId={activeCompany.id}
            ticker={activeCompany.ticker}
            open={activeAction?.type === "adjustment"}
            onOpenChange={(open) => !open && setActiveAction(null)}
          />
          <TransactionHistoryDialog
            companyId={activeCompany.id}
            ticker={activeCompany.ticker}
            open={activeAction?.type === "history"}
            onOpenChange={(open) => !open && setActiveAction(null)}
          />
        </>
      )}

      <Dialog open={!!removingPosition} onOpenChange={(open) => !open && setRemovingPosition(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover {removingPosition?.ticker} da carteira?</DialogTitle>
            <DialogDescription>
              Isso exclui permanentemente todo o histórico de operações deste ativo. Essa ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingPosition(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRemove} loading={isRemoving}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
