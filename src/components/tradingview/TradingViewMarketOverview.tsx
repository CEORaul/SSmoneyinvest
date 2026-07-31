"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { useIsVisibleOnce } from "@/hooks/use-is-visible-once"
import { ChartService } from "@/lib/tradingview/chart-service"
import { TradingViewFallback } from "@/lib/tradingview/fallback"
import { useChartTheme } from "@/lib/tradingview/theme"

export interface MarketOverviewTab {
  title: string
  symbols: { s: string; d: string }[]
}

interface TradingViewMarketOverviewProps {
  /// The widget's own built-in tab switcher (Brasil/EUA/Europa/Cripto/Forex
  /// per Mercado 2.0's spec) — the caller assembles the real symbol list
  /// per tab; this component never invents one.
  tabs: MarketOverviewTab[]
  fallback?: ReactNode
  className?: string
  height?: number | string
}

type MountState = "idle" | "loading" | "ready" | "error"

/// The official free Market Overview Widget — multiple markets switchable
/// via the widget's own internal tabs. Same lazy-mount/skeleton/fallback
/// shape as TradingViewAdvancedChart.
export function TradingViewMarketOverview({ tabs, fallback, className, height = 420 }: TradingViewMarketOverviewProps) {
  const theme = useChartTheme()
  const [containerRef, isVisible] = useIsVisibleOnce<HTMLDivElement>()
  const [state, setState] = useState<MountState>("idle")

  useEffect(() => {
    if (!isVisible) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    setState("loading")

    const config = ChartService.buildConfig({ kind: "MARKET_OVERVIEW", theme, height, params: { tabs } })

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
    // `tabs` is a caller-provided literal array (recreated every render) —
    // comparing by reference would remount on every parent re-render, so
    // only isVisible/theme actually drive a re-mount here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, theme])

  if (!ChartService.isAvailable()) {
    return (
      <TradingViewFallback height={height} className={className}>
        {fallback}
      </TradingViewFallback>
    )
  }

  return (
    <div role="region" aria-label="Visão geral do mercado" className={className}>
      <div ref={containerRef} style={{ height }} className="relative w-full overflow-hidden rounded-lg">
        {(state === "idle" || state === "loading") && (
          <Skeleton className="absolute inset-0 size-full rounded-lg" aria-hidden />
        )}
        {state === "error" && <div className="absolute inset-0">{fallback ?? <TradingViewFallback height={height} />}</div>}
      </div>
    </div>
  )
}
