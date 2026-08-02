import type { StatementFieldDef, StatementPeriodRow } from "@/features/company/statements/types"
import { cn } from "@/lib/utils"

interface StatementTableProps {
  fields: StatementFieldDef[]
  periods: StatementPeriodRow[]
}

function formatValue(value: number | null, unit: StatementFieldDef["unit"]): string {
  if (value == null) return "—"
  const real = unit === "cents" ? value / 100 : value
  if (unit === "cents") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: Math.abs(real) >= 1_000_000 ? "compact" : "standard",
      maximumFractionDigits: 2,
    }).format(real)
  }
  return real.toFixed(2).replace(".", ",")
}

function formatPeriodHeader(endDate: string): string {
  const date = new Date(endDate)
  return date.getUTCMonth() === 11 && date.getUTCDate() >= 28
    ? String(date.getUTCFullYear())
    : `${date.getUTCFullYear()} T${Math.floor(date.getUTCMonth() / 3) + 1}`
}

/// One generic sticky-column table reused for all 4 statement types
/// (Balanço/DRE/Fluxo de Caixa/DVA) — the same horizontal-scroll,
/// sticky-first-column convention already used by ComparisonTable/
/// CategorySection elsewhere in the app. Line items are rows (sticky left
/// column), periods are columns (newest first, scrollable).
export function StatementTable({ fields, periods }: StatementTableProps) {
  if (periods.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Nenhum demonstrativo disponível para este período ainda.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-20 bg-card">
          <tr className="border-b border-border">
            <th scope="col" className="sticky left-0 z-30 bg-card px-3 py-3 text-left font-medium whitespace-nowrap">
              Linha
            </th>
            {periods.map((period) => (
              <th
                key={period.endDate}
                scope="col"
                className="px-3 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap"
              >
                {formatPeriodHeader(period.endDate)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.key} className="border-b border-border last:border-0">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap"
              >
                {field.label}
              </th>
              {periods.map((period) => (
                <td
                  key={period.endDate}
                  className={cn("px-3 py-2.5 text-right tabular-nums whitespace-nowrap", "text-foreground")}
                >
                  {formatValue(period.values[field.key], field.unit)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
