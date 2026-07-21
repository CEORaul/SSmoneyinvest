import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CompanyStockFundamentals } from "@/features/company/queries"

interface BalancoCardProps {
  stock: CompanyStockFundamentals
}

function centsToCurrency(cents: bigint | null): string | null {
  return cents != null ? `R$ ${(Number(cents) / 100).toLocaleString("pt-BR")}` : null
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value ?? "—"}</span>
    </div>
  )
}

/// Single most-recent-snapshot only — see ResultadosCard's comment; the
/// same "no restated time series available" limitation applies here.
export function BalancoCard({ stock }: BalancoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Balanço</CardTitle>
        <p className="text-sm text-muted-foreground">Dados mais recentes disponíveis nesta fonte.</p>
      </CardHeader>
      <CardContent>
        <Row label="Patrimônio Líquido" value={centsToCurrency(stock.equityCents)} />
        <Row label="Dívida Bruta" value={centsToCurrency(stock.grossDebtCents)} />
        <Row label="Dívida Líquida" value={centsToCurrency(stock.netDebtCents)} />
        <Row
          label="Dívida Líquida/EBITDA"
          value={stock.netDebtToEbitda != null ? `${stock.netDebtToEbitda.toFixed(2)}x` : null}
        />
        <Row
          label="Liquidez Corrente"
          value={stock.currentLiquidity != null ? stock.currentLiquidity.toFixed(2) : null}
        />
      </CardContent>
    </Card>
  )
}
