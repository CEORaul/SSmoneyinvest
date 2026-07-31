"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { useIsVisibleOnce } from "@/hooks/use-is-visible-once"
import { ChartService, type ChartRequestSymbol } from "@/lib/tradingview/chart-service"
import { TradingViewFallback } from "@/lib/tradingview/fallback"
import { useChartTheme } from "@/lib/tradingview/theme"

interface TradingViewTickerTapeProps {
  symbols: ChartRequestSymbol[]
  fallback?: ReactNode
  className?: string
}

type MountState = "idle" | "loading" | "ready" | "error"

/// The official free Ticker Tape Widget — a horizontal scrolling strip of
/// quotes. Backs Mercado 2.0's top-of-page ticker tape. Clicking a symbol
/// inside the widget is controlled by TradingView itself (a sealed,
/// cross-origin iframe) — it does not navigate this app to /empresa/
/// [ticker]; see this app's own report on that limitation. Same lazy-
/// mount/skeleton/fallback shape as TradingViewAdvancedChart, just a much
/// shorter default height suited to a thin strip.
export function TradingViewTickerTape({ symbols, fallback, className }: TradingViewTickerTapeProps) {
  const theme = useChartTheme()
  const [containerRef, isVisible] = useIsVisibleOnce<HTMLDivElement>()
  const [state, setState] = useState<MountState>("idle")
  const height = 46

  useEffect(() => {
    if (!isVisible) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    setState("loading")

    const config = ChartService.buildConfig({ kind: "TICKER_TAPE", theme, symbols })

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
    // `symbols` is a caller-provided literal array (recreated every
    // render) — comparing by reference would remount on every parent
    // re-render, so only isVisible/theme actually drive a re-mount here.
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
    <div role="region" aria-label="Cotações em destaque" className={className}>
      <div ref={containerRef} style={{ height }} className="relative w-full overflow-hidden">
        {(state === "idle" || state === "loading") && <Skeleton className="absolute inset-0 size-full" aria-hidden />}
        {state === "error" && <div className="absolute inset-0">{fallback ?? <TradingViewFallback height={height} />}</div>}
      </div>
    </div>
  )
}
