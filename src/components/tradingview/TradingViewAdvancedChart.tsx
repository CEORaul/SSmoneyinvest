"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import type { AssetClass } from "@/generated/prisma/client"
import { useIsVisibleOnce } from "@/hooks/use-is-visible-once"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ChartService } from "@/lib/tradingview/chart-service"
import { TradingViewFallback } from "@/lib/tradingview/fallback"
import { useChartTheme } from "@/lib/tradingview/theme"
import { CHART_BREAKPOINTS_PX, CHART_RESPONSIVE_HEIGHTS } from "@/lib/tradingview/tradingview.config"
import type { ChartInterval } from "@/lib/tradingview/types"

interface TradingViewAdvancedChartProps {
  ticker: string
  assetClass: AssetClass
  interval?: ChartInterval
  /// The existing SSmoney chart to show if TradingView is disabled or its
  /// widget fails to load — on /empresa/[ticker] this is the full
  /// <FinancialChart .../> from src/features/company/components/, which
  /// this component never removes or duplicates rendering of; it only ever
  /// shows one or the other.
  fallback?: ReactNode
  className?: string
}

type MountState = "idle" | "loading" | "ready" | "error"

/// The TradingView Advanced Chart Widget (official free embed) —
/// /empresa/[ticker]'s real main chart as of this phase. Every value it
/// renders with (symbol, theme, locale, timezone, height) comes from
/// ChartService, never a literal here (spec's WIDGET section: "Nunca
/// valores fixos"). Lazy: the script is only injected once this
/// component's own container actually scrolls into the viewport
/// (useIsVisibleOnce) — never on app boot, never on a page that doesn't
/// render this component at all.
export function TradingViewAdvancedChart({ ticker, assetClass, interval, fallback, className }: TradingViewAdvancedChartProps) {
  const theme = useChartTheme()
  const isMobile = useMediaQuery(`(max-width: ${CHART_BREAKPOINTS_PX.tablet - 1}px)`)
  const isTablet = useMediaQuery(`(max-width: ${CHART_BREAKPOINTS_PX.desktop - 1}px)`)
  const height = isMobile ? CHART_RESPONSIVE_HEIGHTS.mobile : isTablet ? CHART_RESPONSIVE_HEIGHTS.tablet : CHART_RESPONSIVE_HEIGHTS.desktop

  const [containerRef, isVisible] = useIsVisibleOnce<HTMLDivElement>()
  const [state, setState] = useState<MountState>("idle")

  useEffect(() => {
    if (!isVisible) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    setState("loading")

    const config = ChartService.buildConfig({ kind: "ADVANCED_CHART", ticker, assetClass, theme, height })
    const configWithInterval = { ...config, interval }

    // The free widget has no imperative "update" API (see provider.ts's
    // updateTheme/updateSymbol doc) — a ticker/theme change re-runs this
    // effect, whose cleanup below tears down the previous mount before the
    // new one is injected into the SAME container, which is the only real
    // way to reflect either change.
    Promise.resolve(ChartService.mount(container, configWithInterval))
      .then(() => {
        if (!cancelled) setState("ready")
      })
      .catch(() => {
        if (!cancelled) setState("error")
      })

    return () => {
      cancelled = true
      ChartService.unmount(container)
    }
    // containerRef is a stable ref object (never needs to be a dependency).
    // height is intentionally excluded: the widget's own "autosize" handles
    // container resizes reactively (no remount needed for that), only a
    // genuinely different chart (ticker/theme/assetClass/interval) should
    // tear down and re-inject the script.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, ticker, theme, assetClass, interval])

  if (!ChartService.isAvailable()) {
    return (
      <TradingViewFallback height={height} className={className}>
        {fallback}
      </TradingViewFallback>
    )
  }

  return (
    <div role="region" aria-label={`Gráfico avançado de ${ticker}`} className={className}>
      <div ref={containerRef} style={{ height }} className="relative w-full overflow-hidden rounded-lg">
        {(state === "idle" || state === "loading") && (
          <Skeleton className="absolute inset-0 size-full rounded-lg" aria-hidden />
        )}
        {state === "error" && <div className="absolute inset-0">{fallback ?? <TradingViewFallback height={height} />}</div>}
      </div>
    </div>
  )
}
