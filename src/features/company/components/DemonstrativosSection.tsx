"use client"

import { useEffect, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getStatementsAction } from "@/features/company/actions"
import { StatementTable } from "@/features/company/components/StatementTable"
import { STATEMENT_FIELDS, STATEMENT_LABELS } from "@/features/company/statements/field-dictionary"
import type { StatementPeriodMode, StatementPeriodRow, StatementType } from "@/features/company/statements/types"

interface DemonstrativosSectionProps {
  companyId: string
}

const STATEMENT_TYPES: StatementType[] = ["BALANCO", "DRE", "FLUXO_CAIXA", "DVA"]
const PERIOD_LABELS: Record<StatementPeriodMode, string> = { ANNUAL: "Anual", QUARTERLY: "Trimestral" }

/// Real, restated financial-statement history (Balanço/DRE/Fluxo de Caixa/
/// DVA, annual + quarterly, 10+ years via BRAPI Pro) — the feature
/// ResultadosCard/BalancoCard's own doc comments now point to instead of
/// duplicating. Both tab rows are pure segmented controls (no TabsContent),
/// matching this app's established Tabs convention (see FinancialChart's
/// period tabs) — content is fetched and rendered manually below based on
/// the two selected values, via one lazy Server Action call per switch.
export function DemonstrativosSection({ companyId }: DemonstrativosSectionProps) {
  const [type, setType] = useState<StatementType>("DRE")
  const [period, setPeriod] = useState<StatementPeriodMode>("ANNUAL")
  // Keyed by type+period so a fetch that resolves after the user has
  // already switched tabs again never overwrites the newer selection's
  // (still-loading) state — the only state ever set from inside the
  // effect is this one object, and only from the async callback, never
  // synchronously in the effect body.
  const [loaded, setLoaded] = useState<{ requestKey: string; rows: StatementPeriodRow[] } | null>(null)
  const requestKey = `${type}:${period}`

  useEffect(() => {
    let cancelled = false
    getStatementsAction(companyId, type, period).then((result) => {
      if (!cancelled) setLoaded({ requestKey: `${type}:${period}`, rows: result })
    })
    return () => {
      cancelled = true
    }
  }, [companyId, type, period])

  const rows = loaded?.requestKey === requestKey ? loaded.rows : null

  return (
    <section id="demonstrativos" className="scroll-mt-24 space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">Demonstrativos Financeiros</h2>
      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{STATEMENT_LABELS[type]}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={type} onValueChange={(value) => setType(value as StatementType)}>
              <TabsList>
                {STATEMENT_TYPES.map((key) => (
                  <TabsTrigger key={key} value={key}>
                    {STATEMENT_LABELS[key]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Tabs value={period} onValueChange={(value) => setPeriod(value as StatementPeriodMode)}>
              <TabsList>
                {(Object.keys(PERIOD_LABELS) as StatementPeriodMode[]).map((key) => (
                  <TabsTrigger key={key} value={key}>
                    {PERIOD_LABELS[key]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : (
            <StatementTable fields={STATEMENT_FIELDS[type]} periods={rows} />
          )}
        </CardContent>
      </Card>
    </section>
  )
}
