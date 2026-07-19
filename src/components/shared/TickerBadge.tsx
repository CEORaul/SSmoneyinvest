"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"

const SIZE_CLASSES = {
  sm: "size-8 text-[11px]",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
} as const

function hashTicker(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

interface TickerBadgeProps {
  ticker: string
  logoUrl?: string | null
  size?: keyof typeof SIZE_CLASSES
  className?: string
}

/// Renders the company's real logo when available; falls back to a
/// deterministic color-per-ticker letter avatar (hue derived from a string
/// hash) when there's no logo or it fails to load.
export function TickerBadge({ ticker, logoUrl, size = "md", className }: TickerBadgeProps) {
  const [imageFailed, setImageFailed] = useState(false)

  if (logoUrl && !imageFailed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 ring-1 ring-border",
          SIZE_CLASSES[size],
          className
        )}
      >
        <img
          src={logoUrl}
          alt={ticker}
          className="size-full object-contain"
          onError={() => setImageFailed(true)}
        />
      </div>
    )
  }

  const letters = (ticker.replace(/\d+$/, "") || ticker).slice(0, 2).toUpperCase()
  const hue = hashTicker(ticker) % 360

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        SIZE_CLASSES[size],
        className
      )}
      style={{ backgroundColor: `oklch(0.58 0.14 ${hue})` }}
    >
      {letters}
    </div>
  )
}
