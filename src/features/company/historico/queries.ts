import "server-only"

import { toNumber } from "@/features/company/statements/queries"
import type { HistoricoMetric, HistoricoSeries, HistoricoSeriesPoint } from "@/features/company/historico/types"
import { getAnnualDividendPerShareSeries } from "@/features/market/dividend-yield"
import { prisma } from "@/lib/prisma"

function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null || denominator === 0) return null
  return (numerator / denominator) * 100
}

/// One 10+ year, per-annual-period line (or a small honest bundle, for
/// ROE/Margens which need two statements joined by endDate) drawn straight
/// from the same BalanceSheetStatement/IncomeStatement/CashFlowStatement
/// rows Demonstrativos reads — never a second data source. Margens
/// deliberately reports Bruta/Operacional/Líquida, not "EBITDA": no stored
/// per-period EBITDA field exists (only a current-snapshot ratio on Stock),
/// and fabricating a historical EBITDA margin from EBIT would misrepresent
/// two different real numbers as the same thing. Currency series keep the
/// underlying *Cents scale (not divided down) — HistoricoSection's default
/// valueFormatter is formatCurrencyCents, same convention FinancialChart's
/// price-history mode already uses.
export async function getHistoricalMetricSeries(companyId: string, metric: HistoricoMetric): Promise<HistoricoSeries[]> {
  switch (metric) {
    case "RECEITA": {
      const rows = await prisma.incomeStatement.findMany({
        where: { companyId, period: "ANNUAL" },
        orderBy: { endDate: "asc" },
      })
      return [
        {
          id: "receita",
          label: "Receita",
          points: rows.map((row) => ({ date: row.endDate.toISOString(), value: toNumber(row.totalRevenueCents) })),
        },
      ]
    }
    case "LUCRO": {
      const rows = await prisma.incomeStatement.findMany({
        where: { companyId, period: "ANNUAL" },
        orderBy: { endDate: "asc" },
      })
      return [
        {
          id: "lucro",
          label: "Lucro Líquido",
          points: rows.map((row) => ({ date: row.endDate.toISOString(), value: toNumber(row.netIncomeCents) })),
        },
      ]
    }
    case "PATRIMONIO": {
      const rows = await prisma.balanceSheetStatement.findMany({
        where: { companyId, period: "ANNUAL" },
        orderBy: { endDate: "asc" },
      })
      return [
        {
          id: "patrimonio",
          label: "Patrimônio Líquido",
          points: rows.map((row) => ({ date: row.endDate.toISOString(), value: toNumber(row.totalEquityCents) })),
        },
      ]
    }
    case "FLUXO_CAIXA": {
      const rows = await prisma.cashFlowStatement.findMany({
        where: { companyId, period: "ANNUAL" },
        orderBy: { endDate: "asc" },
      })
      return [
        {
          id: "fluxoCaixa",
          label: "Fluxo de Caixa Livre",
          points: rows.map((row) => ({ date: row.endDate.toISOString(), value: toNumber(row.freeCashFlowCents) })),
        },
      ]
    }
    case "DIVIDENDOS": {
      const annual = await getAnnualDividendPerShareSeries(companyId)
      return [
        {
          id: "dividendos",
          label: "Dividendos por Ação",
          points: annual.map((row) => ({ date: `${row.year}-12-31`, value: row.totalPerShare })),
        },
      ]
    }
    case "ROE": {
      const [incomeRows, equityRows] = await Promise.all([
        prisma.incomeStatement.findMany({ where: { companyId, period: "ANNUAL" }, orderBy: { endDate: "asc" } }),
        prisma.balanceSheetStatement.findMany({ where: { companyId, period: "ANNUAL" }, orderBy: { endDate: "asc" } }),
      ])
      const equityByDate = new Map(equityRows.map((row) => [row.endDate.toISOString(), toNumber(row.totalEquityCents)]))
      const points: HistoricoSeriesPoint[] = incomeRows.map((row) => {
        const date = row.endDate.toISOString()
        return { date, value: ratio(toNumber(row.netIncomeCents), equityByDate.get(date) ?? null) }
      })
      return [{ id: "roe", label: "ROE", points }]
    }
    case "MARGENS": {
      const rows = await prisma.incomeStatement.findMany({
        where: { companyId, period: "ANNUAL" },
        orderBy: { endDate: "asc" },
      })
      const bruta: HistoricoSeriesPoint[] = []
      const operacional: HistoricoSeriesPoint[] = []
      const liquida: HistoricoSeriesPoint[] = []
      for (const row of rows) {
        const date = row.endDate.toISOString()
        const revenue = toNumber(row.totalRevenueCents)
        bruta.push({ date, value: ratio(toNumber(row.grossProfitCents), revenue) })
        operacional.push({ date, value: ratio(toNumber(row.operatingIncomeCents), revenue) })
        liquida.push({ date, value: ratio(toNumber(row.netIncomeCents), revenue) })
      }
      return [
        { id: "margemBruta", label: "Margem Bruta", points: bruta },
        { id: "margemOperacional", label: "Margem Operacional", points: operacional },
        { id: "margemLiquida", label: "Margem Líquida", points: liquida },
      ]
    }
  }
}
