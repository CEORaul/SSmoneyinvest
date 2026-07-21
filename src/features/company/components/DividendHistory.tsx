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
}

const TYPE_LABELS: Record<DividendPaymentDTO["type"], string> = {
  DIVIDEND: "Dividendo",
  JCP: "JSCP",
  RENDIMENTO: "Rendimento",
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })

export function DividendHistory({ payments, currentPriceCents }: DividendHistoryProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dividendos</CardTitle>
        <p className="text-sm text-muted-foreground">
          Dividend Yield (12 meses):{" "}
          <span className="font-semibold text-foreground">{trailingYield.toFixed(2).replace(".", ",")}%</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
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
