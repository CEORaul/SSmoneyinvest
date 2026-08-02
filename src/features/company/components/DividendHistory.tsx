import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { computeTrailingDividendYield, type DividendPaymentDTO } from "@/features/company/queries"
import { DividendChart } from "@/features/company/components/DividendChart"

interface DividendHistoryProps {
  payments: DividendPaymentDTO[]
  currentPriceCents: number
  /// From dto.stock — payout stays a top-level stat here (not just inside
  /// the Fundamentos grid) since it's specifically about dividend policy,
  /// the same subject as the rest of this section. Same source, no
  /// recomputation.
  payoutPct: number | null
}

const TYPE_LABELS: Record<DividendPaymentDTO["type"], string> = {
  DIVIDEND: "Dividendo",
  JCP: "JSCP",
  RENDIMENTO: "Rendimento",
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })

export function DividendHistory({ payments, currentPriceCents, payoutPct }: DividendHistoryProps) {
  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dividendos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum pagamento registrado ainda para este ativo nesta base.
          </p>
        </CardContent>
      </Card>
    )
  }

  const trailingYield = computeTrailingDividendYield(payments, currentPriceCents) ?? 0
  // All-time accumulated per-share total — a different figure from the
  // trailing-12-month yield above, this is "quanto essa ação já pagou por
  // cota/ação desde que passamos a acompanhar", real DividendPayment rows
  // summed, never estimated.
  const totalPaidPerShare = payments.reduce((sum, p) => sum + p.amountPerShare, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dividendos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-3 sm:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Dividend Yield (12m)</span>
            <span className="text-sm font-semibold tabular-nums">{trailingYield.toFixed(2).replace(".", ",")}%</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Payout</span>
            <span className="text-sm font-semibold tabular-nums">
              {payoutPct != null ? `${payoutPct.toFixed(2).replace(".", ",")}%` : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Total pago por cota/ação</span>
            <span className="text-sm font-semibold tabular-nums">
              R$ {totalPaidPerShare.toFixed(4).replace(".", ",")}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Pagamentos registrados</span>
            <span className="text-sm font-semibold tabular-nums">{payments.length}</span>
          </div>
        </div>
        <DividendChart payments={payments} />
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Data com</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Valor/cota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{TYPE_LABELS[payment.type]}</TableCell>
                  <TableCell>{dateFormatter.format(payment.exDate)}</TableCell>
                  <TableCell>{payment.paymentDate ? dateFormatter.format(payment.paymentDate) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    R$ {payment.amountPerShare.toFixed(4).replace(".", ",")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
