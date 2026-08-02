import type { StatementPeriod } from "@/generated/prisma/client"

/// Re-exported from the Prisma enum rather than redefined — one source of
/// truth for the ANNUAL/QUARTERLY values, no drift risk between the schema
/// and this feature's own types.
export type StatementPeriodMode = StatementPeriod

export type StatementType = "BALANCO" | "DRE" | "FLUXO_CAIXA" | "DVA"

export interface StatementFieldDef {
  key: string
  label: string
  /// "cents" fields divide by 100 before formatting as currency (every
  /// *Cents column in the 4 statement models); "value" fields are already
  /// in their natural unit (DRE's per-share EPS columns).
  unit: "cents" | "value"
}

export interface StatementPeriodRow {
  endDate: string
  values: Record<string, number | null>
}
