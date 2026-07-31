/// TradingViewTypes — every shared shape the TradingView module (and, later,
/// the components/pages that adopt it) agree on. Nothing here calls or
/// imports TradingView itself; this file only exists so a real integration
/// later never has to invent its config shape ad hoc per call site.

/// A chart's visual theme — always already resolved (never "system"), see
/// theme.ts's resolveChartTheme().
export type ChartTheme = "light" | "dark"

/// Locale codes SSmoney actually supports today, not the full TradingView
/// locale list — add a language here, not as a magic string at a call site.
export type ChartLocale = "pt" | "en"

/// TradingView-style interval codes ("1" = 1 minuto, "D" = diário, ...) —
/// prepared now so a future provider's config never invents its own shape.
export type ChartInterval = "1" | "5" | "15" | "30" | "60" | "120" | "240" | "D" | "W" | "M"

/// One entry per component in src/components/tradingview/ — lets the
/// service layer (and, later, analytics/logging) refer to a widget kind by a
/// stable name instead of a component name string.
export type ChartWidgetKind =
  | "CHART"
  | "MINI_CHART"
  | "ADVANCED_CHART"
  | "MARKET_OVERVIEW"
  | "HEATMAP"
  | "TICKER_TAPE"

/// Which concrete engine renders a chart — "internal" is SSmoney's own
/// existing Recharts-based FinancialChart (src/features/company/components/
/// FinancialChart.tsx, untouched by this module), the other two are the two
/// integration paths from the spec's ESTRATÉGIA section (free widgets vs.
/// the licensed Charting Library). Switching between them is a config change
/// (see tradingview.config.ts's provider field), never a page/component
/// change — that guarantee is the entire point of this module.
export type ChartProviderName = "internal" | "tradingview-widget" | "tradingview-library"

/// One ticker as a chart needs to see it. `tradingViewSymbol` is optional —
/// it's only resolvable once a real provider (and its exchange-prefix
/// convention, e.g. "BMFBOVESPA:PETR4") exists; that mapping will live in
/// utils.ts's toTradingViewSymbol().
export interface ChartSymbol {
  ticker: string
  exchange?: string
  tradingViewSymbol?: string
}

export interface ChartSize {
  width: number | string
  height: number | string
}

/// The one config shape every ChartProvider.mount() call receives,
/// regardless of which engine ends up rendering it — this is what makes a
/// future provider swap invisible to every caller. `symbol` is for the
/// single-symbol widgets (CHART/MINI_CHART/ADVANCED_CHART); `symbols` is for
/// the multi-symbol ones (MARKET_OVERVIEW/HEATMAP/TICKER_TAPE) — a widget
/// kind only ever populates the one that applies to it.
export interface ChartRenderConfig {
  kind: ChartWidgetKind
  symbol?: ChartSymbol
  symbols?: ChartSymbol[]
  theme: ChartTheme
  locale: ChartLocale
  timezone: string
  size: ChartSize
  interval?: ChartInterval
  /// Escape hatch for widget-specific config that doesn't belong in the
  /// shared shape above (e.g. Market Overview's own `tabs`, Heatmap's own
  /// `dataSource`) — kept schemaless on purpose since it's inherently
  /// per-widget-kind; a provider that doesn't understand a given key simply
  /// ignores it, same reasoning as RadarEvent.metadata elsewhere in this app.
  params?: Record<string, unknown>
}

/// The SOLID strategy contract every chart engine implements identically.
/// Per the spec's ESTRATÉGIA section, three conformers are planned —
/// InternalChartProvider (wraps the existing FinancialChart),
/// TradingViewWidgetProvider (free embeds), TradingViewLibraryProvider (the
/// licensed Charting Library) — and per this same phase's scope, NONE of
/// them is implemented yet (see provider.ts). Agreeing on this interface now
/// is what lets any of the three be built later without ever touching a
/// page or TradingViewService's own callers.
export interface ChartProvider {
  readonly name: ChartProviderName
  /// False for every provider until it's actually implemented — once real,
  /// this reports whether THIS engine specifically is ready to render
  /// (script loaded, license key present, etc.), never a hardcoded true.
  isAvailable(): boolean
  mount(container: HTMLElement, config: ChartRenderConfig): void | Promise<void>
  unmount(container: HTMLElement): void
  updateTheme(theme: ChartTheme): void
  updateSymbol(symbol: ChartSymbol): void
}
