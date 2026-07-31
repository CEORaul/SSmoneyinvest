import { injectTradingViewWidget, removeWidget } from "@/lib/tradingview/loader"
import { toTradingViewLocale, toTradingViewSymbol } from "@/lib/tradingview/utils"
import type { ChartProvider, ChartRenderConfig, ChartSymbol, ChartTheme } from "@/lib/tradingview/types"

/// TradingViewProvider (widget) — the real ChartProvider conformer behind
/// "tradingview-widget" (see tradingview.config.ts's CHART_PROVIDER). Talks
/// to TradingView ONLY through TradingViewLoader (the sole script-injection
/// point) and TradingViewUtils (the sole symbol/locale conversion point) —
/// this file never builds a script tag or a raw symbol string itself.
///
/// Uses only official free embed widgets
/// (https://www.tradingview.com/widget/) — never the paid Charting Library,
/// per this app's explicit scope. One function per ChartWidgetKind builds
/// that widget's own JSON schema; mount() just dispatches to the right one.
/// A future TradingViewLibraryProvider (name: "tradingview-library") would
/// implement this exact same interface differently and register under its
/// own key in service.ts; nothing here or in any caller would need to change.
const SCRIPT_BASE = "https://s3.tradingview.com/external-embedding"

function mountAdvancedChart(container: HTMLElement, config: ChartRenderConfig): Promise<void> {
  if (!config.symbol) {
    return Promise.reject(new Error("TradingView: nenhum símbolo informado para o Advanced Chart Widget."))
  }
  return injectTradingViewWidget(container, `${SCRIPT_BASE}/embed-widget-advanced-chart.js`, {
    autosize: true,
    symbol: toTradingViewSymbol(config.symbol),
    interval: config.interval ?? "D",
    timezone: config.timezone,
    theme: config.theme,
    style: "1",
    locale: toTradingViewLocale(config.locale),
    allow_symbol_change: false,
    enable_publishing: false,
    support_host: "https://www.tradingview.com",
  })
}

/// Mini Chart Widget — single symbol, price + mini sparkline. Backs
/// Mercado 2.0's Índices/Criptomoedas sections.
function mountMiniChart(container: HTMLElement, config: ChartRenderConfig): Promise<void> {
  if (!config.symbol) {
    return Promise.reject(new Error("TradingView: nenhum símbolo informado para o Mini Chart Widget."))
  }
  return injectTradingViewWidget(container, `${SCRIPT_BASE}/embed-widget-mini-symbol-overview.js`, {
    symbol: toTradingViewSymbol(config.symbol),
    width: "100%",
    height: "100%",
    locale: toTradingViewLocale(config.locale),
    dateRange: "12M",
    colorTheme: config.theme,
    isTransparent: false,
    autosize: true,
    largeChartUrl: "",
  })
}

/// Market Overview Widget — its "tabs" (Brasil/EUA/Europa/Cripto/Forex per
/// Mercado 2.0's spec) are the widget's own built-in tab switcher, passed
/// through `config.params.tabs` (the caller assembles the real symbol list
/// per tab; this file never invents one).
function mountMarketOverview(container: HTMLElement, config: ChartRenderConfig): Promise<void> {
  const tabs = config.params?.tabs
  if (!Array.isArray(tabs) || tabs.length === 0) {
    return Promise.reject(new Error("TradingView: nenhuma aba configurada para o Market Overview Widget."))
  }
  return injectTradingViewWidget(container, `${SCRIPT_BASE}/embed-widget-market-overview.js`, {
    colorTheme: config.theme,
    dateRange: "12M",
    showChart: true,
    locale: toTradingViewLocale(config.locale),
    width: "100%",
    height: "100%",
    largeChartUrl: "",
    isTransparent: false,
    showSymbolLogo: true,
    showFloatingTooltip: false,
    tabs,
  })
}

/// Stock Heatmap Widget — `dataSource` is TradingView's own fixed universe
/// name (e.g. "SPX500", "AllUSA"; NOT "Crypto" — that value only exists on
/// the separate Crypto Coins Heatmap widget below, feeding it here just
/// silently falls back to the widget's own default), passed via
/// `config.params.dataSource`; this file never guesses one on its own.
function mountHeatmap(container: HTMLElement, config: ChartRenderConfig): Promise<void> {
  const dataSource = config.params?.dataSource
  if (typeof dataSource !== "string" || dataSource.length === 0) {
    return Promise.reject(new Error("TradingView: nenhuma fonte de dados configurada para o Heatmap Widget."))
  }
  return injectTradingViewWidget(container, `${SCRIPT_BASE}/embed-widget-stock-heatmap.js`, {
    exchanges: [],
    dataSource,
    grouping: "sector",
    blockSize: "market_cap_basic",
    blockColor: "change",
    locale: toTradingViewLocale(config.locale),
    symbolUrl: "",
    colorTheme: config.theme,
    hasTopBar: false,
    isDataSetEnabled: false,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: "100%",
    height: "100%",
  })
}

/// Crypto Coins Heatmap Widget — a DIFFERENT free widget/script than the
/// Stock Heatmap above, not the same widget with a different `dataSource`.
/// TradingView's own stock-heatmap bundle only recognizes stock/country
/// universes ("SPX500", "AllUSA", ...) — feeding it "Crypto" is silently
/// ignored and it falls back to its default (SPX500), which is exactly the
/// bug this widget fixes: crypto needs `embed-widget-crypto-coins-heatmap.js`,
/// whose own config shape has no `exchanges`/`grouping`, just `dataSource`
/// (fixed at "Crypto", its only real value) and its own `blockColor` scale.
function mountCryptoHeatmap(container: HTMLElement, config: ChartRenderConfig): Promise<void> {
  return injectTradingViewWidget(container, `${SCRIPT_BASE}/embed-widget-crypto-coins-heatmap.js`, {
    dataSource: "Crypto",
    blockSize: "market_cap_calc",
    blockColor: "24h_close_change|5",
    locale: toTradingViewLocale(config.locale),
    symbolUrl: "",
    colorTheme: config.theme,
    hasTopBar: false,
    isDataSetEnabled: false,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: "100%",
    height: "100%",
  })
}

/// Ticker Tape Widget — multi-symbol horizontal strip. `title` is the raw
/// ticker (e.g. "IBOV", "PETR4") since that's exactly what Mercado 2.0's
/// spec wants displayed, not a re-derived label.
function mountTickerTape(container: HTMLElement, config: ChartRenderConfig): Promise<void> {
  const symbols = config.symbols ?? []
  if (symbols.length === 0) {
    return Promise.reject(new Error("TradingView: nenhum símbolo configurado para o Ticker Tape Widget."))
  }
  return injectTradingViewWidget(container, `${SCRIPT_BASE}/embed-widget-tickers.js`, {
    symbols: symbols.map((symbol) => ({ proName: toTradingViewSymbol(symbol), title: symbol.ticker })),
    showSymbolLogo: true,
    isTransparent: false,
    displayMode: "adaptive",
    colorTheme: config.theme,
    locale: toTradingViewLocale(config.locale),
  })
}

export const tradingViewProvider: ChartProvider = {
  name: "tradingview-widget",

  // Always true — whether TradingView can actually render is only knowable
  // once mount() is attempted (script/network can fail at any moment); this
  // reports "this engine is wired up," not "the last mount succeeded."
  // Each TradingView* component's own error state (from a rejected mount())
  // is what triggers the real fallback, not this flag.
  isAvailable(): boolean {
    return true
  },

  mount(container: HTMLElement, config: ChartRenderConfig): Promise<void> {
    switch (config.kind) {
      case "ADVANCED_CHART":
      case "CHART":
        return mountAdvancedChart(container, config)
      case "MINI_CHART":
        return mountMiniChart(container, config)
      case "MARKET_OVERVIEW":
        return mountMarketOverview(container, config)
      case "HEATMAP":
        return mountHeatmap(container, config)
      case "CRYPTO_HEATMAP":
        return mountCryptoHeatmap(container, config)
      case "TICKER_TAPE":
        return mountTickerTape(container, config)
      default:
        return Promise.reject(new Error(`TradingView: tipo de widget não suportado (${config.kind}).`))
    }
  },

  unmount(container: HTMLElement): void {
    removeWidget(container)
  },

  // The free embed widgets expose no imperative update API — each is a
  // sealed, cross-origin iframe once mounted. The only real way to reflect
  // a new theme/symbol is a full unmount+remount, which every
  // TradingView* component already gets by re-running its mount effect
  // when theme/symbol/tab changes. These two stay documented no-ops rather
  // than pretending an update API exists that doesn't.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ChartProvider interface conformance; no imperative update API exists for these widgets
  updateTheme(theme: ChartTheme): void {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ChartProvider interface conformance; no imperative update API exists for these widgets
  updateSymbol(symbol: ChartSymbol): void {},
}
