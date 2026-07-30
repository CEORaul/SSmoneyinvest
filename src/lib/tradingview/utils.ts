import type { AssetClass } from "@/generated/prisma/client"
import {
  CHART_BREAKPOINTS_PX,
  CHART_RESPONSIVE_HEIGHTS,
  DEFAULT_CHART_EXCHANGE,
  DEFAULT_CHART_LOCALE,
  DEFAULT_CHART_SIZE,
  DEFAULT_CHART_TIMEZONE,
} from "@/lib/tradingview/tradingview.config"
import type { ChartLocale, ChartRenderConfig, ChartSize, ChartSymbol, ChartTheme, ChartWidgetKind } from "@/lib/tradingview/types"

/// TradingView exchange prefix per SSmoney AssetClass — every B3-listed
/// category (STOCK/FII/ETF/BDR) uses the same "BMFBOVESPA" exchange.
/// CRYPTO tickers in this app are stored in a Coinbase-compatible pair
/// format already (e.g. "BTCUSD", per the spec's own VALIDAÇÃO list —
/// Company rows for CRYPTO are manual-entry only, see asset-category.ts's
/// hasMarketData: false), so they map to "COINBASE" instead of guessing a
/// Binance-style "USDT" rewrite the stored ticker doesn't have.
/// FIXED_INCOME/OTHER have no real tradable market symbol at all (manual-
/// entry categories with no market data — see asset-category.ts) — they
/// fall back to the B3 default; TradingView simply won't resolve that
/// symbol, which is exactly what TradingViewFallback exists to catch, never
/// a reason to special-case them here.
const EXCHANGE_BY_ASSET_CLASS: Record<AssetClass, string> = {
  STOCK: "BMFBOVESPA",
  FII: "BMFBOVESPA",
  ETF: "BMFBOVESPA",
  BDR: "BMFBOVESPA",
  CRYPTO: "COINBASE",
  FIXED_INCOME: "BMFBOVESPA",
  OTHER: "BMFBOVESPA",
}

/// The one place AssetClass -> TradingView exchange is decided — no page or
/// component ever picks an exchange itself (VALIDAÇÃO section: "Nunca
/// espalhar lógica pelas páginas").
export function resolveExchangeForAssetClass(assetClass: AssetClass): string {
  return EXCHANGE_BY_ASSET_CLASS[assetClass] ?? DEFAULT_CHART_EXCHANGE
}

/// TradingView's widget locale codes don't match ISO 639-1 for Portuguese —
/// it's "br" (Brazilian Portuguese), not "pt". Kept as its own conversion
/// (not folded into ChartLocale itself) so the rest of the app keeps using
/// the ISO code everywhere else it appears; only the actual widget payload
/// needs TradingView's own spelling.
const TRADINGVIEW_LOCALE_BY_CHART_LOCALE: Record<ChartLocale, string> = {
  pt: "br",
  en: "en",
}

export function toTradingViewLocale(locale: ChartLocale): string {
  return TRADINGVIEW_LOCALE_BY_CHART_LOCALE[locale]
}

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
