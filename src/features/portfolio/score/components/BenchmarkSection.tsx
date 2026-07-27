"use client"

import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { BenchmarkRow } from "@/features/portfolio/score/benchmarks"
import { formatPercent } from "@/utils/format"

interface BenchmarkSectionProps {
  rows: BenchmarkRow[]
}

function ReturnCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  return <span className={value >= 0 ? "text-gain" : "text-loss"}>{formatPercent(value)}</span>
}

/// "Minha Carteira" always shows a real, already-computed return (same
/// figure as PortfolioSummaryCards). Ibovespa/IFIX/CDI/S&P 500/Bitcoin have
/// no real data source in this app today — same "Dado disponível quando
/// sincronizado" convention as UnavailableFilterControl in the Mercado
/// feature: a real, clickable row that explains why instead of a fabricated
/// number or a silently missing one.
export function BenchmarkSection({ rows }: BenchmarkSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação com benchmarks</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Benchmark</TableHead>
              <TableHead className="text-right">Acumulada</TableHead>
              <TableHead className="text-right">Anual</TableHead>
              <TableHead className="text-right">Mensal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-medium">{row.label}</TableCell>
                {row.available ? (
                  <>
                    <TableCell className="text-right">
                      <ReturnCell value={row.cumulativeReturnPct} />
                    </TableCell>
                    <TableCell className="text-right">
                      <ReturnCell value={row.annualReturnPct} />
                    </TableCell>
                    <TableCell className="text-right">
                      <ReturnCell value={row.monthlyReturnPct} />
                    </TableCell>
                  </>
                ) : (
                  <TableCell colSpan={3} className="text-right">
                    <button
                      type="button"
                      onClick={() => toast.info(row.unavailableReason ?? "Dado indisponível.")}
                      className="inline-flex items-center"
                    >
                      <Badge variant="outline" className="cursor-pointer">
                        Indisponível
                      </Badge>
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
