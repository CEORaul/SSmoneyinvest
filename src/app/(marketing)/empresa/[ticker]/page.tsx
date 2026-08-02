import { notFound } from "next/navigation"

import { computeDataCoverage } from "@/features/company/coverage"
import { INDICATOR_DEFINITIONS } from "@/features/company/indicators"
import {
  computeTrailingDividendYield,
  getCompanyByTicker,
  getCotacaoStats,
  getDividendHistory,
  getPriceHistoryForRange,
  getSimilarCompanies,
  getUserPositionSummary,
  isCompanyFavorited,
  type CompanyDetailDTO,
} from "@/features/company/queries"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import type { TradeCompany } from "@/features/portfolio/components/TradeDialog"
import { logAssetView } from "@/features/search/queries"
import { TradingViewAdvancedChart } from "@/components/tradingview/TradingViewAdvancedChart"
import { RecentViewTracker } from "@/features/search/components/RecentViewTracker"
import { BalancoCard } from "@/features/company/components/BalancoCard"
import { CompanyHealthScore } from "@/features/company/components/CompanyHealthScore"
import { CompanyHeader } from "@/features/company/components/CompanyHeader"
import { CompanySummaryCard } from "@/features/company/components/CompanySummaryCard"
import { CotacaoStatsCard } from "@/features/company/components/CotacaoStatsCard"
import { CoverageBanner } from "@/features/company/components/CoverageBanner"
import { DemonstrativosSection } from "@/features/company/components/DemonstrativosSection"
import { DividendHistory } from "@/features/company/components/DividendHistory"
import { FinancialChart } from "@/features/company/components/FinancialChart"
import { HistoricoSection } from "@/features/company/components/HistoricoSection"
import { IndicatorGrid } from "@/features/company/components/IndicatorGrid"
import { MyPositionCard } from "@/features/company/components/MyPositionCard"
import { ResultadosCard } from "@/features/company/components/ResultadosCard"
import { SimilarCompaniesSection } from "@/features/company/components/SimilarCompaniesSection"
import { getOptionalProfile } from "@/lib/auth/session"

const DEFAULT_CHART_PERIOD = "6M" as const

interface EmpresaPageProps {
  params: Promise<{ ticker: string }>
}

export default async function EmpresaPage({ params }: EmpresaPageProps) {
  const { ticker } = await params

  const dto = await getCompanyByTicker(ticker)
  if (!dto) notFound()

  const profile = await getOptionalProfile()

  const [positionSummary, similarCompanies, priceHistory, dividendHistory, cotacaoStats, favorited] =
    await Promise.all([
      profile ? getUserPositionSummary(profile.id, dto.id) : Promise.resolve(null),
      getSimilarCompanies(dto),
      getPriceHistoryForRange(dto.id, DEFAULT_CHART_PERIOD),
      getDividendHistory(dto.id),
      getCotacaoStats(dto),
      profile ? isCompanyFavorited(profile.id, dto.id) : Promise.resolve(false),
      // Real usage data for "Últimos ativos vistos" (mega menu, search
      // dropdown) — best-effort, never blocks or fails the page render.
      logAssetView(dto.id, profile?.id ?? null),
    ])

  const category = getAssetCategoryMeta(dto.assetClass)

  // Stock/Fii/Etf.dividendYield is never populated by any sync (BRAPI's own
  // yield field uses a different fiscal convention than ours) — the
  // indicator card and coverage % should reflect the same real trailing-
  // 12-month computation DividendHistory shows, not a permanently-null column.
  const trailingDividendYield = computeTrailingDividendYield(dividendHistory, dto.priceCents)
  const dtoWithYield: CompanyDetailDTO =
    trailingDividendYield == null
      ? dto
      : {
          ...dto,
          stock: dto.stock ? { ...dto.stock, dividendYield: trailingDividendYield } : null,
          fii: dto.fii ? { ...dto.fii, dividendYield: trailingDividendYield } : null,
          etf: dto.etf ? { ...dto.etf, dividendYield: trailingDividendYield } : null,
        }

  const coverage = computeDataCoverage(dtoWithYield, {
    priceHistoryCount: priceHistory.length,
    dividendHistoryCount: dividendHistory.length,
  })

  // Reuses the exact same formula indicators.ts's Fundamentos card uses
  // (Market Cap + Dívida Líquida, an exact identity) rather than a second
  // computation — this just adapts its reais-denominated result into the
  // cents CotacaoStatsCard's other stats already use.
  const enterpriseValueReais = INDICATOR_DEFINITIONS.find((i) => i.key === "enterpriseValue")?.getValue(dtoWithYield) ?? null
  const enterpriseValueCents = enterpriseValueReais != null ? Math.round(enterpriseValueReais * 100) : null

  const tradeCompany: TradeCompany = {
    id: dto.id,
    ticker: dto.ticker,
    name: dto.name,
    logoUrl: dto.logoUrl,
    assetClass: dto.assetClass,
    priceSource: dto.priceCents > 0 ? "AUTO" : "MANUAL",
  }

  const initialPricePoints = priceHistory.map((point) => ({
    date: point.date.toISOString(),
    closeCents: point.closeCents,
    volume: point.volume != null ? point.volume.toString() : null,
  }))

  return (
    <div className="w-full space-y-8 px-6 py-10 lg:px-8 xl:px-10 2xl:px-12">
      <RecentViewTracker
        isAuthenticated={!!profile}
        company={{
          id: dto.id,
          ticker: dto.ticker,
          name: dto.name,
          logoUrl: dto.logoUrl,
          assetClass: dto.assetClass,
          priceCents: dto.priceCents,
          priceChangePct: dto.priceChangePct,
        }}
      />

      <CompanyHeader
        dto={dto}
        tradeCompany={tradeCompany}
        initialFavorited={favorited}
        isAuthenticated={!!profile}
      />

      <CoverageBanner coverage={coverage} />

      {positionSummary && <MyPositionCard company={tradeCompany} position={positionSummary} />}

      <section id="visao-geral" className="scroll-mt-24 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Visão Geral</h2>

        <CompanySummaryCard dto={dtoWithYield} />

        <div className="rounded-xl border border-border bg-card p-4">
          <TradingViewAdvancedChart
            ticker={dto.ticker}
            assetClass={dto.assetClass}
            fallback={
              <FinancialChart
                companyId={dto.id}
                initialPeriod={DEFAULT_CHART_PERIOD}
                initialPoints={initialPricePoints}
              />
            }
          />
        </div>

        <CotacaoStatsCard stats={cotacaoStats} enterpriseValueCents={enterpriseValueCents} />
      </section>

      <IndicatorGrid dto={dtoWithYield} />

      {category.hasFundamentals && <CompanyHealthScore dto={dtoWithYield} />}

      <DividendHistory
        payments={dividendHistory}
        currentPriceCents={dto.priceCents}
        payoutPct={dtoWithYield.stock?.payout ?? null}
      />

      {category.hasFundamentals && dto.stock && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ResultadosCard stock={dto.stock} />
          <BalancoCard stock={dto.stock} />
        </div>
      )}

      {category.hasFundamentals && dto.stock && <DemonstrativosSection companyId={dto.id} />}

      {category.hasFundamentals && dto.stock && <HistoricoSection companyId={dto.id} />}

      <SimilarCompaniesSection companies={similarCompanies} />
    </div>
  )
}
