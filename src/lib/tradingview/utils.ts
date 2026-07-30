import {
  CHART_BREAKPOINTS_PX,
  CHART_RESPONSIVE_HEIGHTS,
  DEFAULT_CHART_EXCHANGE,
  DEFAULT_CHART_LOCALE,
  DEFAULT_CHART_SIZE,
  DEFAULT_CHART_TIMEZONE,
} from "@/lib/tradingview/tradingview.config"
import type { ChartRenderConfig, ChartSize, ChartSymbol, ChartTheme, ChartWidgetKind } from "@/lib/tradingview/types"

/// TradingViewUtils — pure helper functions, no I/O, no DOM access. Every
/// function here is structure only (RESPONSIVIDADE/ARQUITETURA sections):
/// real usage starts once a provider (provider.ts) actually calls these
/// while mounting a widget.

/// "PETR4" -> "BMFBOVESPA:PETR4" — TradingView symbols need an exchange
/// prefix this app doesn't track per company yet, so every ticker falls
/// back to DEFAULT_CHART_EXCHANGE until a real per-company/per-AssetClass
/// mapping exists (tracked as a config change, not a call-site change).
export function toTradingViewSymbol(symbol: ChartSymbol): string {
  if (symbol.tradingViewSymbol) return symbol.tradingViewSymbol
  const exchange = symbol.exchange ?? DEFAULT_CHART_EXCHANGE
  return `${exchange}:${symbol.ticker.toUpperCase()}`
}

/// A stable DOM id for a future imperative mount target
/// (ChartProvider.mount(container, ...) needs a real container element) —
/// scoped by widget kind + ticker so two different widgets for the same
/// ticker on one page (e.g. TradingViewChart + TradingViewMiniChart) never
/// collide.
export function buildWidgetContainerId(kind: ChartWidgetKind, ticker?: string): string {
  const suffix = ticker ? ticker.toLowerCase() : "default"
  return `tradingview-${kind.toLowerCase().replace(/_/g, "-")}-${suffix}`
}

/// Desktop/Tablet/Mobile height per RESPONSIVIDADE — width is always fluid
/// ("100%"), only the height step-changes at the same breakpoints Tailwind's
/// own defaults use (see tradingview.config.ts's CHART_BREAKPOINTS_PX).
export function resolveResponsiveSize(viewportWidth: number): ChartSize {
  const height =
    viewportWidth >= CHART_BREAKPOINTS_PX.desktop
      ? CHART_RESPONSIVE_HEIGHTS.desktop
      : viewportWidth >= CHART_BREAKPOINTS_PX.tablet
        ? CHART_RESPONSIVE_HEIGHTS.tablet
        : CHART_RESPONSIVE_HEIGHTS.mobile

  return { width: "100%", height }
}

/// Assembles the one ChartRenderConfig every TradingView* component builds
/// before checking TradingViewService.isAvailable() — kept in one place so
/// all 7 components construct it identically instead of repeating the same
/// object literal (locale/timezone/size defaults) seven times.
export function buildChartRenderConfig(input: {
  kind: ChartWidgetKind
  theme: ChartTheme
  symbol?: ChartSymbol
  symbols?: ChartSymbol[]
  height?: number | string
}): ChartRenderConfig {
  return {
    kind: input.kind,
    symbol: input.symbol,
    symbols: input.symbols,
    theme: input.theme,
    locale: DEFAULT_CHART_LOCALE,
    timezone: DEFAULT_CHART_TIMEZONE,
    size: { width: DEFAULT_CHART_SIZE.width, height: input.height ?? DEFAULT_CHART_SIZE.height },
  }
}
