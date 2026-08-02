"use client"

import { useLiveMarketPrice, type LiveMarketPriceInput } from "@/hooks/use-live-market-price"
import { formatCompactNumber } from "@/utils/format"

interface LiveVolumeTextProps extends LiveMarketPriceInput {
  className?: string
  /// When set, renders "{label} {value}" together (CompanyHeader's "Volume
  /// 25,3 mi" style) instead of a bare number — hidden as one unit when
  /// there's no volume, never a dangling label with nothing after it.
  label?: string
  /// Shown instead of nothing when there's no volume (e.g. a "—" cell next
  /// to a static "Liquidez" label that must always render) — defaults to
  /// rendering nothing, matching a plain `volume != null && (...)` guard.
  fallback?: React.ReactNode
}

/// Drop-in replacement for a static formatCompactNumber(volume) text node
/// — renders `fallback` (nothing, by default) when the live snapshot has
/// no volume, exactly like the static `company.volume != null && (...)`
/// guard it replaces, except the guard is now evaluated against the live
/// value, not the initial one.
export function LiveVolumeText({ className, label, fallback = null, ...input }: LiveVolumeTextProps) {
  const live = useLiveMarketPrice(input)
  if (live.volume == null) return <>{fallback}</>

  const formatted = formatCompactNumber(live.volume)
  if (label) {
    return (
      <span className={className}>
        {label} <span className="font-medium text-foreground">{formatted}</span>
      </span>
    )
  }
  return <span className={className}>{formatted}</span>
}
