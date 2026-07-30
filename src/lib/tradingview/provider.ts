import { injectAdvancedChartWidget, removeWidget } from "@/lib/tradingview/loader"
import { toTradingViewLocale, toTradingViewSymbol } from "@/lib/tradingview/utils"
import type { ChartProvider, ChartRenderConfig, ChartSymbol, ChartTheme } from "@/lib/tradingview/types"

/// TradingViewProvider (widget) — the real ChartProvider conformer behind
/// "tradingview-widget" (see tradingview.config.ts's CHART_PROVIDER). Talks
/// to TradingView ONLY through TradingViewLoader (the sole script-injection
/// point) and TradingViewUtils (the sole symbol/locale conversion point) —
/// this file never builds a script tag or a raw symbol string itself.
///
/// Uses the official free Advanced Chart Widget
/// (https://www.tradingview.com/widget/advanced-chart/) — never the paid
/// Charting Library, per this phase's explicit scope. A future
/// TradingViewLibraryProvider (name: "tradingview-library") would implement
/// this exact same interface differently and register under its own key in
/// service.ts; nothing here or in any caller would need to change.
export const tradingViewProvider: ChartProvider = {
  name: "tradingview-widget",

  // Always true — whether TradingView can actually render is only knowable
  // once mount() is attempted (script/network can fail at any moment); this
  // reports "this engine is wired up," not "the last mount succeeded."
  // TradingViewAdvancedChart's own error state (from a rejected mount()) is
  // what triggers the real fallback, not this flag.
  isAvailable(): boolean {
    return true
  },

  mount(container: HTMLElement, config: ChartRenderConfig): Promise<void> {
    if (!config.symbol) {
      return Promise.reject(new Error("TradingView: nenhum símbolo informado para o Advanced Chart Widget."))
    }

    return injectAdvancedChartWidget(container, {
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
  },

  unmount(container: HTMLElement): void {
    removeWidget(container)
  },

  // The free embed widget exposes no imperative update API — it's a sealed,
  // cross-origin iframe once mounted. The only real way to reflect a new
  // theme/symbol is a full unmount+remount, which TradingViewAdvancedChart
  // already gets by keying its container on `${ticker}-${theme}` (React
  // remounts it for us). These two stay documented no-ops rather than
  // pretending an update API exists that doesn't.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ChartProvider interface conformance; no imperative update API exists for this widget
  updateTheme(theme: ChartTheme): void {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ChartProvider interface conformance; no imperative update API exists for this widget
  updateSymbol(symbol: ChartSymbol): void {},
}
