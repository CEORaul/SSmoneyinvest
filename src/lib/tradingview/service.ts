import { tradingViewProvider } from "@/lib/tradingview/provider"
import { CHART_PROVIDER } from "@/lib/tradingview/tradingview.config"
import type { ChartProvider, ChartProviderName, ChartRenderConfig, ChartSymbol, ChartTheme } from "@/lib/tradingview/types"

/// A placeholder "internal" conformer — SSmoney's own existing chart
/// (src/features/company/components/FinancialChart.tsx) is a React
/// component, not an imperative mount()/unmount() widget, so it is
/// deliberately NOT wired to this interface in this phase (that would mean
/// altering FinancialChart, which this phase's spec explicitly forbids).
/// This stub only proves the registry wiring works; every TradingView*
/// component instead falls back to rendering the caller's own existing
/// chart directly via TradingViewFallback, bypassing this provider entirely
/// until a real InternalChartProvider is built.
const internalProvider: ChartProvider = {
  name: "internal",
  isAvailable: () => false,
  mount: () => {},
  unmount: () => {},
  updateTheme: () => {},
  updateSymbol: () => {},
}

/// Every chart engine this app knows how to talk to. Adding a real
/// TradingViewWidgetProvider/TradingViewLibraryProvider later means
/// implementing ChartProvider once (see provider.ts's own doc) and adding
/// one line here — never a change to any page or component.
///
/// "tradingview-widget" and "tradingview-library" both point at today's
/// single (unimplemented) tradingViewProvider stub, `name`-overridden per
/// key so activeProviderName always reports whichever one CHART_PROVIDER
/// actually selected — once the stub splits into two real files, each just
/// registers itself under its own key instead.
const PROVIDERS: Record<ChartProviderName, ChartProvider> = {
  internal: internalProvider,
  "tradingview-widget": { ...tradingViewProvider, name: "tradingview-widget" },
  "tradingview-library": { ...tradingViewProvider, name: "tradingview-library" },
}

function getActiveProvider(): ChartProvider {
  return PROVIDERS[CHART_PROVIDER] ?? internalProvider
}

/// TradingViewService — the ONLY abstraction any page or component is
/// allowed to depend on (spec's ABSTRAÇÃO section: "Nenhuma página deve
/// depender diretamente da TradingView... Toda comunicação deverá acontecer
/// através de TradingViewService"). Every method below delegates to
/// whichever provider tradingview.config.ts's CHART_PROVIDER selects; today
/// that's always "internal", whose isAvailable() is permanently false, so
/// every caller correctly falls back to its own existing chart. Swapping to
/// a real TradingView integration later is exactly one config change here —
/// no caller of this service ever changes.
export const TradingViewService = {
  isAvailable(): boolean {
    return getActiveProvider().isAvailable()
  },
  mount(container: HTMLElement, config: ChartRenderConfig): void | Promise<void> {
    return getActiveProvider().mount(container, config)
  },
  unmount(container: HTMLElement): void {
    getActiveProvider().unmount(container)
  },
  updateTheme(theme: ChartTheme): void {
    getActiveProvider().updateTheme(theme)
  },
  updateSymbol(symbol: ChartSymbol): void {
    getActiveProvider().updateSymbol(symbol)
  },
  get activeProviderName(): ChartProviderName {
    return getActiveProvider().name
  },
}
