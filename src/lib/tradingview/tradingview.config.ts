import type { ChartLocale, ChartProviderName, ChartSize } from "@/lib/tradingview/types"

/// TradingViewConfig — the single source of truth for every TradingView-
/// related default (tema, idioma, timezone, tamanho, provider ativo). No
/// call site should ever hardcode one of these values; it should import
/// from here instead, so a future integration is a config edit, not a
/// project-wide search-and-replace.

/// Which chart engine renders right now — flips the whole app in one place
/// (see src/lib/tradingview/service.ts's PROVIDERS registry). NEXT_PUBLIC_
/// prefix because chart rendering happens client-side. Defaults to the real
/// free-widget integration as of this phase; set
/// NEXT_PUBLIC_CHART_PROVIDER=internal to force SSmoney's own chart
/// everywhere without a code change (e.g. to fully disable TradingView in
/// an environment), or "tradingview-library" once that provider exists.
export const CHART_PROVIDER: ChartProviderName =
  (process.env.NEXT_PUBLIC_CHART_PROVIDER as ChartProviderName | undefined) ?? "tradingview-widget"

export const DEFAULT_CHART_LOCALE: ChartLocale = "pt"

/// Matches every other absolute-time display in this app (utils/format.ts)
/// — a chart's own timestamps must read in the same timezone as everything
/// else on the page.
export const DEFAULT_CHART_TIMEZONE = "America/Sao_Paulo"

export const DEFAULT_CHART_SIZE: ChartSize = {
  width: "100%",
  height: 400,
}

/// Breakpoint values matching Tailwind's own defaults (sm/lg), so a future
/// chart resizes at the exact points the rest of the page's layout already
/// reflows at — never a bespoke breakpoint just for charts.
export const CHART_BREAKPOINTS_PX = {
  tablet: 640,
  desktop: 1024,
} as const

/// One height per breakpoint (RESPONSIVIDADE section) — utils.ts's
/// resolveResponsiveSize() is where these get picked based on viewport
/// width.
export const CHART_RESPONSIVE_HEIGHTS = {
  mobile: 280,
  tablet: 360,
  desktop: 480,
} as const

/// TradingView symbols need an exchange prefix (e.g. "BMFBOVESPA:PETR4"),
/// which this app doesn't track per company today. Kept as a single named
/// default so utils.ts's toTradingViewSymbol() has exactly one place to read
/// it from once a real per-company/per-AssetClass mapping is decided.
export const DEFAULT_CHART_EXCHANGE = "BMFBOVESPA"
