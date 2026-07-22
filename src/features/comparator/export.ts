import type { IndicatorUnit } from "@/features/company/indicators"

export interface ExportRow {
  label: string
  unit: IndicatorUnit
  /// One entry per company, same order as ExportData.tickers.
  values: (number | null)[]
}

export interface ExportData {
  tickers: string[]
  rows: ExportRow[]
}

const UNIT_SUFFIX: Record<IndicatorUnit, string> = {
  percent: "%",
  currency: "R$",
  ratio: "",
  count: "un",
  years: "anos",
}

function csvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/// Builds the CSV straight from the exact data the caller already rendered
/// (ExportToolbar receives the same ExportData the page built for
/// ComparisonTable) — never a second query, so the export can't drift from
/// what's on screen. Raw numeric values (machine-readable), one column
/// header noting the unit, not the on-screen formatted display strings.
export function buildComparisonCsv(data: ExportData): string {
  const header = ["Indicador", ...data.tickers].map(csvCell).join(",")
  const lines = data.rows.map((row) => {
    const label = UNIT_SUFFIX[row.unit] ? `${row.label} (${UNIT_SUFFIX[row.unit]})` : row.label
    const cells = row.values.map((value) => (value == null ? "" : String(value)))
    return [label, ...cells].map(csvCell).join(",")
  })
  return [header, ...lines].join("\n")
}
