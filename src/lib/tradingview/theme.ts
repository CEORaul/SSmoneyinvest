"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import type { ChartTheme } from "@/lib/tradingview/types"

/// Pure mapping — next-themes' resolvedTheme is "light" | "dark" |
/// undefined (the undefined case only exists before mount/hydration); this
/// collapses that into the ChartTheme a provider actually expects, never
/// exposing "system" to a chart (no chart engine understands it).
export function resolveChartTheme(resolvedTheme: string | undefined): ChartTheme {
  return resolvedTheme === "dark" ? "dark" : "light"
}

/// TradingViewTheme — the sync SSmoney's theme toggle (Claro/Escuro/
/// Sistema) will drive automatically once a real chart provider exists. The
/// mapping itself is real today (it's just app-internal state, no
/// TradingView call involved); only *applying* this value to a live widget
/// via ChartProvider.updateTheme() is deferred until a provider is
/// implemented (see provider.ts).
///
/// Mirrors ThemeToggle.tsx's own mount-guard: the real theme is only
/// knowable after client mount (next-themes reads localStorage/matchMedia),
/// so this returns "light" during SSR/first paint and corrects itself in an
/// effect — the same one-frame tradeoff ThemeToggle already accepts.
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- next-themes' own documented pattern: real theme is only knowable post-mount
    setMounted(true)
  }, [])

  return mounted ? resolveChartTheme(resolvedTheme) : "light"
}
