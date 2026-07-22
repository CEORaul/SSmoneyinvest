import { redirect } from "next/navigation"

import { computeTrailingDividendYield, type CompanyDetailDTO } from "@/features/company/queries"
import type { ChartPeriod } from "@/features/company/queries"
import { getCompaniesByTickers, getDividendHistoryForCompanies, getPriceHistoryForCompanies } from "@/features/comparator/queries"
import { assignColors } from "@/features/comparator/colors"
import { toDateKey } from "@/features/comparator/chart-modes"
import { MAX_COMPARISON_ASSETS } from "@/features/comparator/constants"
import { ComparatorControls } from "@/features/comparator/components/ComparatorControls"
import { ComparisonAnalysisPanel } from "@/features/comparator/components/ComparisonAnalysisPanel"
import { ComparisonChartSection, type ChartCompanyInput } from "@/features/comparator/components/ComparisonChartSection"
import { ComparisonExecutiveSummaryCard } from "@/features/comparator/components/ComparisonExecutiveSummaryCard"
import { ComparisonHealthScoreStrip } from "@/features/comparator/components/ComparisonHealthScoreStrip"
import { ComparisonTable } from "@/features/comparator/components/ComparisonTable"
import { ExportToolbar } from "@/features/comparator/components/ExportToolbar"
import type { ExportData } from "@/features/comparator/export"
import { getComparisonIndicatorRows } from "@/features/comparator/table-highlights"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { getOptionalProfile } from "@/lib/auth/session"

const DEFAULT_CHART_PERIOD: ChartPeriod = "6M"

interface ComparePageProps {
  searchParams: Promise<{ tickers?: string }>
}

function parseTickers(raw: string | undefined): string[] {
  if (!raw) return []
  const deduped = [...new Set(raw.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean))]
  return deduped.slice(0, MAX_COMPARISON_ASSETS)
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { tickers: tickersParam } = await searchParams
  const requestedTickers = parseTickers(tickersParam)

  const profile = await getOptionalProfile()
  const portfolioSummary = profile ? await getPortfolioSummary(profile.id) : null

  // Landing on /comparar with no ?tickers= is no longer an empty state for
  // a signed-in visitor with a portfolio — default straight to "Todas as
  // posições" instead of an empty picker. Goes through a real redirect
  // (not just rendering with different data) so the URL stays the single
  // source of truth for selection — the page is still shareable/
  // bookmarkable at exactly what it shows.
  if (requestedTickers.length === 0 && portfolioSummary && portfolioSummary.positions.length > 0) {
    const defaultTickers = portfolioSummary.positions
      .slice(0, MAX_COMPARISON_ASSETS)
      .map((position) => position.ticker)
    redirect(`/comparar?tickers=${defaultTickers.join(",")}`)
  }

  const rawCompanies =
    requestedTickers.length > 0 ? await getCompaniesByTickers(requestedTickers) : []
  const resolvedTickers = new Set(rawCompanies.map((c) => c.ticker))
  const unresolvedTickers = requestedTickers.filter((t) => !resolvedTickers.has(t))

  const companyIds = rawCompanies.map((c) => c.id)

  // getPriceHistoryForCompanies/getDividendHistoryForCompanies both already
  // short-circuit to an empty Map for an empty companyIds array, so this
  // stays a single unconditional Promise.all rather than branching.
  const [priceHistory, dividendHistory] = await Promise.all([
    getPriceHistoryForCompanies(companyIds, DEFAULT_CHART_PERIOD),
    getDividendHistoryForCompanies(companyIds),
  ])

  // Same override the individual /empresa/[ticker] page applies —
  // Stock/Fii/Etf.dividendYield is never populated by any sync (BRAPI's own
  // yield field uses a different fiscal convention), so the "Dividend
  // Yield" row/AI fact only ever has a real value via this trailing-12-
  // month computation over the batched dividend history already fetched.
  const companies: CompanyDetailDTO[] = rawCompanies.map((company) => {
    const trailingYield = computeTrailingDividendYield(
      dividendHistory.get(company.id) ?? [],
      company.priceCents
    )
    if (trailingYield == null) return company
    return {
      ...company,
      stock: company.stock ? { ...company.stock, dividendYield: trailingYield } : null,
      fii: company.fii ? { ...company.fii, dividendYield: trailingYield } : null,
      etf: company.etf ? { ...company.etf, dividendYield: trailingYield } : null,
    }
  })

  const positionByCompanyId = new Map(
    (portfolioSummary?.positions ?? []).map((position) => [
      position.companyId,
      { quantity: Number(position.quantity), investedCents: position.investedCents },
    ])
  )

  const chartCompanies: ChartCompanyInput[] = companies.map((company) => ({
    companyId: company.id,
    ticker: company.ticker,
    pricePoints: (priceHistory.get(company.id) ?? []).map((point) => ({
      date: toDateKey(point.date),
      closeCents: point.closeCents,
    })),
    dividendPoints: (dividendHistory.get(company.id) ?? []).map((payment) => ({
      exDate: toDateKey(payment.exDate),
      amountPerShare: payment.amountPerShare,
    })),
    position: positionByCompanyId.get(company.id) ?? null,
  }))

  const hasSelection = companies.length > 0
  const hasEnoughForAi = companies.length >= 2
  const tickers = companies.map((c) => c.ticker)

  // Built from the exact same companies/rows ComparisonTable renders — the
  // CSV export can never drift from what's on screen since it's the same
  // source data, not a second query.
  const exportData: ExportData = {
    tickers,
    rows: [
      { label: "Preço", unit: "currency", values: companies.map((c) => c.priceCents / 100) },
      { label: "Variação", unit: "percent", values: companies.map((c) => c.priceChangePct) },
      {
        label: "Market Cap",
        unit: "currency",
        values: companies.map((c) => (c.marketCapCents != null ? Number(c.marketCapCents) / 100 : null)),
      },
      ...getComparisonIndicatorRows(companies).map((indicator) => ({
        label: indicator.label,
        unit: indicator.unit,
        values: companies.map((c) => indicator.getValue(c)),
      })),
    ],
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Comparador de Ativos</h1>
        <p className="text-sm text-muted-foreground">
          Compare ações, FIIs, ETFs, BDRs, criptomoedas e mais — lado a lado, com dados
          exclusivamente do banco de dados da SSmoney.
        </p>
      </div>

      <ComparatorControls
        companies={companies.map((c) => ({ id: c.id, ticker: c.ticker, name: c.name, logoUrl: c.logoUrl }))}
        unresolvedTickers={unresolvedTickers}
      />

      {!hasSelection ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium">Nenhum ativo selecionado</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Busque por ticker, nome, empresa ou setor acima, ou use a seleção rápida para
            começar a comparar até {MAX_COMPARISON_ASSETS} ativos.
          </p>
        </div>
      ) : (
        <>
          {hasEnoughForAi && <ComparisonExecutiveSummaryCard companies={companies} />}

          <ExportToolbar exportData={exportData}>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">Gráfico comparativo</h2>
              <div className="rounded-xl border border-border bg-card p-4">
                <ComparisonChartSection companies={chartCompanies} initialPeriod={DEFAULT_CHART_PERIOD} />
              </div>
            </section>

            <ComparisonHealthScoreStrip companies={companies} />

            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">Comparação de indicadores</h2>
              <ComparisonTable companies={companies} colors={assignColors(companyIds)} />
            </section>
          </ExportToolbar>

          {hasEnoughForAi && <ComparisonAnalysisPanel tickers={tickers} />}
        </>
      )}
    </div>
  )
}
