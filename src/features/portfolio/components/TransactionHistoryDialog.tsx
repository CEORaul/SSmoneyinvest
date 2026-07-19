"use client"

import { Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  deleteTransactionAction,
  getPositionTransactionsAction,
  type TransactionRow,
} from "@/features/portfolio/actions"
import { formatCurrencyCents } from "@/utils/format"

interface TransactionHistoryDialogProps {
  companyId: string
  ticker: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TYPE_LABELS: Record<string, string> = {
  BUY: "Compra",
  SELL: "Venda",
  DIVIDEND: "Dividendo",
  JCP: "JSCP",
  BONUS: "Bonificação",
  SPLIT: "Desdobramento",
  REVERSE_SPLIT: "Grupamento",
}

export function TransactionHistoryDialog({
  companyId,
  ticker,
  open,
  onOpenChange,
}: TransactionHistoryDialogProps) {
  const [transactions, setTransactions] = useState<TransactionRow[] | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // The parent only ever keeps this mounted while `open` is true (see
  // PortfolioBoard's `{activeCompany && (...)}` wrapper), so `transactions`
  // is already `null` on every fresh open — no need to reset it here too.
  useEffect(() => {
    if (!open) return
    getPositionTransactionsAction(companyId).then(setTransactions)
  }, [open, companyId])

  async function handleDelete(transactionId: string) {
    setDeletingId(transactionId)
    const result = await deleteTransactionAction(transactionId)
    setDeletingId(null)

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível excluir a operação")
      return
    }

    toast.success("Operação excluída")
    setTransactions((current) => current?.filter((t) => t.id !== transactionId) ?? null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico de operações — {ticker}</DialogTitle>
          <DialogDescription>Todas as operações registradas para este ativo.</DialogDescription>
        </DialogHeader>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {transactions === null ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma operação registrada.
            </p>
          ) : (
            transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{TYPE_LABELS[t.type] ?? t.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("pt-BR")}
                    </span>
                    {t.isManualPrice && <Badge variant="secondary">Preço manual</Badge>}
                  </div>
                  <p className="text-sm">
                    {t.quantity} × {formatCurrencyCents(t.priceCents)} ={" "}
                    <span className="font-medium">{formatCurrencyCents(Number(t.totalCents))}</span>
                  </p>
                  {t.realizedProfitCents != null && (
                    <p
                      className={
                        Number(t.realizedProfitCents) >= 0
                          ? "text-xs text-gain"
                          : "text-xs text-loss"
                      }
                    >
                      Lucro realizado: {formatCurrencyCents(Number(t.realizedProfitCents))}
                    </p>
                  )}
                  {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(t.id)}
                  loading={deletingId === t.id}
                  aria-label="Excluir operação"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
