"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import type { AssetClass } from "@/generated/prisma/client"
import { useIsVisibleOnce } from "@/hooks/use-is-visible-once"
import { ChartService } from "@/lib/tradingview/chart-service"
import { TradingViewFallback } from "@/lib/tradingview/fallback"
import { useChartTheme } from "@/lib/tradingview/theme"

interface TradingViewMiniChartProps {
  ticker: string
  /// Omit for a symbol that isn't a SSmoney Company row (an index like
  /// IBOV, a forex pair) — pass `tradingViewSymbol` instead.
  assetClass?: AssetClass
  tradingViewSymbol?: string
  /// e.g. a Sparkline from src/features/portfolio/components/ — shown while
  /// the widget is disabled or fails to load.
  fallback?: ReactNode
  className?: string
  height?: number | string
}

type MountState = "idle" | "loading" | "ready" | "error"

/// A compact, single-symbol price+mini-chart — the official free Mini
/// Symbol Overview Widget. Backs Mercado 2.0's Índices/Criptomoedas
/// sections. Same lazy-mount/skeleton/fallback shape as
/// TradingViewAdvancedChart, just single-height (no responsive breakpoints
/// needed — these are already small, uniform cards).
export function TradingViewMiniChart({ ticker, assetClass, tradingViewSymbol, fallback, className, height = 180 }: TradingViewMiniChartProps) {
  const theme = useChartTheme()
  const [containerRef, isVisible] = useIsVisibleOnce<HTMLDivElement>()
  const [state, setState] = useState<MountState>("idle")

  useEffect(() => {
    if (!isVisible) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    setState("loading")

    const config = ChartService.buildConfig({ kind: "MINI_CHART", theme, ticker, assetClass, tradingViewSymbol, height })

    Promise.resolve(ChartService.mount(container, config))
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
    // containerRef is a stable ref object; height never changes
    // independently of a real remount trigger here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, ticker, assetClass, tradingViewSymbol, theme])

  if (!ChartService.isAvailable()) {
    return (
      <TradingViewFallback height={height} className={className}>
        {fallback}
      </TradingViewFallback>
    )
  }

  return (
    <div role="region" aria-label={`Mini gráfico de ${ticker}`} className={className}>
      <div ref={containerRef} style={{ height }} className="relative w-full overflow-hidden rounded-lg">
        {(state === "idle" || state === "loading") && (
          <Skeleton className="absolute inset-0 size-full rounded-lg" aria-hidden />
        )}
        {state === "error" && <div className="absolute inset-0">{fallback ?? <TradingViewFallback height={height} />}</div>}
      </div>
    </div>
  )
}
