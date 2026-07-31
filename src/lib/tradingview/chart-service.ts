import type { AssetClass } from "@/generated/prisma/client"
import { TradingViewService } from "@/lib/tradingview/service"
import { buildChartRenderConfig, resolveExchangeForAssetClass } from "@/lib/tradingview/utils"
import type { ChartRenderConfig, ChartTheme, ChartWidgetKind } from "@/lib/tradingview/types"

export interface ChartRequestSymbol {
  ticker: string
  /// Omit for symbols that aren't SSmoney Company rows at all (indices like
  /// IBOV, forex like Dólar) — pass `tradingViewSymbol` directly instead.
  assetClass?: AssetClass
  /// Overrides assetClass-based exchange resolution entirely — the only way
  /// to reference a real TradingView symbol (e.g. "BMFBOVESPA:IBOV",
  /// "FX:USDBRL") that has no corresponding Company/AssetClass in this app.
  tradingViewSymbol?: string
}

export interface ChartRequest {
  kind: ChartWidgetKind
  theme: ChartTheme
  height?: number | string
  /// Single-symbol widgets (ADVANCED_CHART/CHART/MINI_CHART).
  ticker?: string
  assetClass?: AssetClass
  /// Overrides assetClass-based exchange resolution for the single-symbol
  /// case too — see ChartRequestSymbol's own doc.
  tradingViewSymbol?: string
  /// Multi-symbol widgets (TICKER_TAPE) — each entry resolved the same way
  /// as ticker/assetClass/tradingViewSymbol above.
  symbols?: ChartRequestSymbol[]
  /// Widget-specific extra config (Market Overview's own `tabs`, Heatmap's
  /// own `dataSource`) — passed straight through to ChartRenderConfig.params.
  params?: Record<string, unknown>
}

function resolveSymbol(symbol: ChartRequestSymbol) {
  return {
    ticker: symbol.ticker,
    exchange: symbol.assetClass ? resolveExchangeForAssetClass(symbol.assetClass) : undefined,
    tradingViewSymbol: symbol.tradingViewSymbol,
  }
}

/// ChartService — the ONLY layer a page or component talks to (spec:
/// "Toda integração deve utilizar exclusivamente a arquitetura ChartProvider
/// criada na etapa anterior" + this phase's own ARQUITETURA list naming
/// ChartService explicitly). It sits one level above TradingViewService:
/// TradingViewService only knows how to delegate to whichever ChartProvider
/// is active; ChartService additionally knows how to turn "a page has a
/// ticker (or a list of them) + an AssetClass" into a fully-formed
/// ChartRenderConfig (resolving the real exchange via TradingViewUtils)
/// before handing off. Every TradingView* component builds its request
/// through here, so that assembly logic is written once, not once per
/// widget kind.
export const ChartService = {
  isAvailable(): boolean {
    return TradingViewService.isAvailable()
  },

  buildConfig(request: ChartRequest): ChartRenderConfig {
    return buildChartRenderConfig({
      kind: request.kind,
      theme: request.theme,
      symbol: request.ticker
        ? resolveSymbol({ ticker: request.ticker, assetClass: request.assetClass, tradingViewSymbol: request.tradingViewSymbol })
        : undefined,
      symbols: request.symbols?.map(resolveSymbol),
      height: request.height,
      params: request.params,
    })
  },

  mount(container: HTMLElement, config: ChartRenderConfig): void | Promise<void> {
    return TradingViewService.mount(container, config)
  },

  unmount(container: HTMLElement): void {
    TradingViewService.unmount(container)
  },
}
