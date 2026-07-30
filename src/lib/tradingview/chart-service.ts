import type { AssetClass } from "@/generated/prisma/client"
import { TradingViewService } from "@/lib/tradingview/service"
import { buildChartRenderConfig, resolveExchangeForAssetClass } from "@/lib/tradingview/utils"
import type { ChartRenderConfig, ChartTheme, ChartWidgetKind } from "@/lib/tradingview/types"

export interface ChartRequest {
  kind: ChartWidgetKind
  ticker: string
  assetClass: AssetClass
  theme: ChartTheme
  height?: number | string
}

/// ChartService — the ONLY layer a page or component talks to (spec:
/// "Toda integração deve utilizar exclusivamente a arquitetura ChartProvider
/// criada na etapa anterior" + this phase's own ARQUITETURA list naming
/// ChartService explicitly). It sits one level above TradingViewService:
/// TradingViewService only knows how to delegate to whichever ChartProvider
/// is active; ChartService additionally knows how to turn "a page has a
/// ticker + an AssetClass" into a fully-formed ChartRenderConfig (resolving
/// the real exchange via TradingViewUtils) before handing off. Every future
/// TradingView* call site (Mercado, Comparador, Notícias) builds its
/// request through here too, so that assembly logic is written once, not
/// once per page.
export const ChartService = {
  isAvailable(): boolean {
    return TradingViewService.isAvailable()
  },

  buildConfig(request: ChartRequest): ChartRenderConfig {
    const exchange = resolveExchangeForAssetClass(request.assetClass)
    return buildChartRenderConfig({
      kind: request.kind,
      theme: request.theme,
      symbol: { ticker: request.ticker, exchange },
      height: request.height,
    })
  },

  mount(container: HTMLElement, config: ChartRenderConfig): void | Promise<void> {
    return TradingViewService.mount(container, config)
  },

  unmount(container: HTMLElement): void {
    TradingViewService.unmount(container)
  },
}
