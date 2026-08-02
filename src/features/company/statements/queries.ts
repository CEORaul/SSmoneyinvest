import "server-only"

import { STATEMENT_FIELDS } from "@/features/company/statements/field-dictionary"
import type { StatementPeriodMode, StatementType } from "@/features/company/statements/types"
import { prisma } from "@/lib/prisma"

interface RawPeriodRow {
  endDate: Date
  [key: string]: unknown
}

export function toNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "object" && "toNumber" in (value as { toNumber: () => number })) {
    return (value as { toNumber: () => number }).toNumber()
  }
  return typeof value === "number" ? value : null
}

/// One query per statement type — each Prisma model has its own strictly-
/// typed delegate, so this stays a plain switch rather than fighting the
/// generated types with a generic model-lookup map. Ordered newest-first;
/// callers that want oldest-first (e.g. a chart) reverse the array
/// themselves rather than this function guessing the caller's intent.
export async function getStatementPeriods(
  companyId: string,
  type: StatementType,
  period: StatementPeriodMode
): Promise<{ endDate: Date; values: Record<string, number | null> }[]> {
  let rows: RawPeriodRow[]
  switch (type) {
    case "BALANCO":
      rows = await prisma.balanceSheetStatement.findMany({ where: { companyId, period }, orderBy: { endDate: "desc" } })
      break
    case "DRE":
      rows = await prisma.incomeStatement.findMany({ where: { companyId, period }, orderBy: { endDate: "desc" } })
      break
    case "FLUXO_CAIXA":
      rows = await prisma.cashFlowStatement.findMany({ where: { companyId, period }, orderBy: { endDate: "desc" } })
      break
    case "DVA":
      rows = await prisma.valueAddedStatement.findMany({ where: { companyId, period }, orderBy: { endDate: "desc" } })
      break
  }

  const fieldKeys = STATEMENT_FIELDS[type].map((field) => field.key)
  return rows.map((row) => ({
    endDate: row.endDate,
    values: Object.fromEntries(fieldKeys.map((key) => [key, toNumber(row[key])])),
  }))
}
