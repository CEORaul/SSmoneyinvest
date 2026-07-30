import type { ChartWidgetKind } from "@/lib/tradingview/types"

/// A documented, zero-risk stand-in for actually editing the 6 pages named
/// in the spec's PÁGINAS section. Editing those files today — even with an
/// inert marker — is unnecessary risk for a phase whose entire point is
/// "não alterar nenhuma funcionalidade existente" (repeated verbatim in the
/// spec's own NÃO ALTERAR section, which names every one of these same
/// pages). This registry is the map a future integration reads to know
/// exactly where each TradingView* component belongs, without a single
/// line of any page's current code having changed.
export interface TradingViewIntegrationPoint {
  page: string
  filePath: string
  /// The existing SSmoney chart this spot already renders, if any — the
  /// natural `fallback` prop value once this page is actually wired up.
  existingChartComponent: string | null
  futureComponent: string
  widgetKind: ChartWidgetKind
  note?: string
}

export const TRADINGVIEW_INTEGRATION_MAP: TradingViewIntegrationPoint[] = [
  {
    page: "Empresa",
    filePath: "src/app/(marketing)/empresa/[ticker]/page.tsx",
    existingChartComponent: "FinancialChart (src/features/company/components/FinancialChart.tsx)",
    futureComponent: "TradingViewAdvancedChart",
    widgetKind: "ADVANCED_CHART",
    note: "Also the natural mount point for TradingViewModal's fullscreen expand button.",
  },
  {
    page: "Mercado",
    filePath: "src/app/(marketing)/mercado/page.tsx",
    existingChartComponent: null,
    futureComponent: "TradingViewMarketOverview, TradingViewHeatmap, or TradingViewTickerTape",
    widgetKind: "MARKET_OVERVIEW",
  },
  {
    page: "Comparador",
    filePath: "src/app/(marketing)/comparar/page.tsx",
    existingChartComponent:
      "FinancialChart in multi-series mode (src/features/comparator/components/ComparisonChartSection.tsx)",
    futureComponent: "TradingViewChart per selected company, or TradingViewAdvancedChart",
    widgetKind: "CHART",
  },
  {
    page: "Radar",
    filePath: "src/app/(main)/radar/page.tsx",
    existingChartComponent: null,
    futureComponent: "TradingViewMiniChart per position/opportunity row",
    widgetKind: "MINI_CHART",
  },
  {
    page: "Notícias",
    filePath: "src/app/(main)/noticias/page.tsx",
    existingChartComponent: null,
    futureComponent: "TradingViewMiniChart per matched-company chip (NewsArticleQuickActions)",
    widgetKind: "MINI_CHART",
  },
  {
    page: "Alertas",
    filePath: "src/app/(main)/alertas/page.tsx",
    existingChartComponent: null,
    futureComponent: "TradingViewMiniChart per alert row",
    widgetKind: "MINI_CHART",
    note:
      'The spec\'s "Monitor" refers to Monitor de Ativos, a feature already removed from this project — Alertas is its closest living equivalent, same substitution already established for /noticias\' own Alertas tab.',
  },
]
