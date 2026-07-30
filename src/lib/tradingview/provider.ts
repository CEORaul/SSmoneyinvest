import type { ChartProvider, ChartSymbol, ChartTheme } from "@/lib/tradingview/types"

/// TradingViewProvider — the not-yet-implemented ChartProvider conformer for
/// TradingView itself. Per the spec's explicit scope for this phase ("NÃO
/// integrar a TradingView ainda... Não implementar nada. Somente
/// estruturar"), every method below is a deliberate no-op/false — this file
/// exists only so TradingViewService (service.ts) has a real object to
/// register today, proving the registry wiring works, without pretending
/// TradingView is actually available.
///
/// This single stub stands in for BOTH future TradingView paths from the
/// spec's ESTRATÉGIA section. Once a real choice is made, it splits into two
/// sibling files — TradingViewWidgetProvider (free embeds, name:
/// "tradingview-widget") and TradingViewLibraryProvider (the licensed
/// Charting Library, name: "tradingview-library") — each implementing this
/// exact same ChartProvider interface, registered under their own name in
/// service.ts's PROVIDERS map. Nothing that calls TradingViewService would
/// need to change either way.
export const tradingViewProvider: ChartProvider = {
  name: "tradingview-widget",

  isAvailable(): boolean {
    return false
  },

  mount(): void {
    // Intentionally not implemented — see file doc above.
  },

  unmount(): void {
    // Intentionally not implemented — see file doc above.
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ChartProvider interface conformance; intentionally not implemented yet
  updateTheme(theme: ChartTheme): void {
    // Intentionally not implemented — see file doc above.
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ChartProvider interface conformance; intentionally not implemented yet
  updateSymbol(symbol: ChartSymbol): void {
    // Intentionally not implemented — see file doc above.
  },
}
