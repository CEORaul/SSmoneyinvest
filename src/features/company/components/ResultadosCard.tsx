import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CompanyStockFundamentals } from "@/features/company/queries"

interface ResultadosCardProps {
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

/// Single most-recent-snapshot only — BRAPI doesn't expose a restated
/// quarterly/annual time series at any confirmed plan tier, so a
/// trimestre/ano toggle here would have nothing real behind it. This is a
/// deliberate scope reduction from a literal quarterly/annual view,
/// documented in the etapa's final report.
export function ResultadosCard({ stock }: ResultadosCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados</CardTitle>
        <p className="text-sm text-muted-foreground">Dados mais recentes disponíveis nesta fonte.</p>
      </CardHeader>
      <CardContent>
        <Row label="Receita" value={centsToCurrency(stock.revenueCents)} />
        <Row label="Lucro" value={centsToCurrency(stock.netIncomeCents)} />
        <Row label="EBITDA" value={centsToCurrency(stock.ebitdaCents)} />
        <Row label="Margem Bruta" value={stock.grossMargin != null ? `${stock.grossMargin.toFixed(2)}%` : null} />
        <Row label="Margem EBITDA" value={stock.ebitdaMargin != null ? `${stock.ebitdaMargin.toFixed(2)}%` : null} />
        <Row label="Margem Líquida" value={stock.netMargin != null ? `${stock.netMargin.toFixed(2)}%` : null} />
      </CardContent>
    </Card>
  )
}
