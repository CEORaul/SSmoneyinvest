"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { useIsVisibleOnce } from "@/hooks/use-is-visible-once"
import { ChartService } from "@/lib/tradingview/chart-service"
import { TradingViewFallback } from "@/lib/tradingview/fallback"
import { useChartTheme } from "@/lib/tradingview/theme"

interface TradingViewHeatmapProps {
  /// TradingView's own fixed Stock Heatmap universe name (e.g. "SPX500",
  /// "AllUSA") — this component never guesses one; category-switching
  /// (Ações/FIIs/ETFs/Cripto) is the caller's job, picking which
  /// `dataSource` (or fallback) to render per selected tab. Ignored when
  /// `kind` is "CRYPTO_HEATMAP" (that widget has its own fixed universe).
  dataSource: string
  /// "HEATMAP" (default) is the Stock Heatmap widget; "CRYPTO_HEATMAP" is
  /// the separate, dedicated Crypto Coins Heatmap widget — NOT the same
  /// widget with a crypto `dataSource` (TradingView has no such value on
  /// the stock widget; see TradingViewProvider's own doc comment on this).
  kind?: "HEATMAP" | "CRYPTO_HEATMAP"
  fallback?: ReactNode
  className?: string
  height?: number | string
}

type MountState = "idle" | "loading" | "ready" | "error"

/// The official free Stock Heatmap Widget — color proportional to
/// variação, block size proportional to market cap (both are the widget's
/// own built-in behavior, not something this app computes). Same lazy-
/// mount/skeleton/fallback shape as TradingViewAdvancedChart.
export function TradingViewHeatmap({
  dataSource,
  kind = "HEATMAP",
  fallback,
  className,
  height = 420,
}: TradingViewHeatmapProps) {
  const theme = useChartTheme()
  const [containerRef, isVisible] = useIsVisibleOnce<HTMLDivElement>()
  const [state, setState] = useState<MountState>("idle")

  useEffect(() => {
    if (!isVisible) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    setState("loading")

    const config = ChartService.buildConfig({ kind, theme, height, params: { dataSource } })

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
  }, [isVisible, dataSource, kind, theme])

  if (!ChartService.isAvailable()) {
    return (
      <TradingViewFallback height={height} className={className}>
        {fallback}
      </TradingViewFallback>
    )
  }

  return (
    <div role="region" aria-label="Mapa de calor do mercado" className={className}>
      <div ref={containerRef} style={{ height }} className="relative w-full overflow-hidden rounded-lg">
        {(state === "idle" || state === "loading") && (
          <Skeleton className="absolute inset-0 size-full rounded-lg" aria-hidden />
        )}
        {state === "error" && <div className="absolute inset-0">{fallback ?? <TradingViewFallback height={height} />}</div>}
      </div>
    </div>
  )
}
