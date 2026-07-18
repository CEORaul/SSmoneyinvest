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
  size?: keyof typeof SIZE_CLASSES
  className?: string
}

/// Deterministic color per ticker (hue derived from a string hash) so the
/// same company always renders the same badge without needing real logos.
export function TickerBadge({ ticker, size = "md", className }: TickerBadgeProps) {
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
