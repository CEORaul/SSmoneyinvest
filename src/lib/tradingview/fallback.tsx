import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface TradingViewFallbackProps {
  /// The existing SSmoney chart/widget to show instead of "Coming Soon" —
  /// per the spec's FALLBACK section ("Caso TradingView não esteja
  /// disponível. Mostrar automaticamente: Gráfico atual da SSmoney"). Every
  /// TradingView* component accepts this same prop and passes it straight
  /// through here; nothing in this module ever renders a real SSmoney chart
  /// itself, keeping this a pure UI decision (children present vs. absent),
  /// never a data/behavior dependency.
  children?: ReactNode
  height?: number | string
  className?: string
}

/// TradingViewFallback — the one place every TradingView* component decides
/// what to show while no real provider exists: the caller's own existing
/// chart (`children`) when one was passed in, otherwise a plain "Coming
/// Soon" placeholder. Once a real ChartProvider is implemented, this same
/// component keeps working as the *unavailable*-state branch (e.g. the
/// active provider's isAvailable() returning false) — it never goes away,
/// it just gets rendered less often.
export function TradingViewFallback({ children, height = 320, className }: TradingViewFallbackProps) {
  if (children) return <>{children}</>

  return (
    <div
      style={{ height }}
      className={cn(
        "flex w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-center text-sm text-muted-foreground",
        className
      )}
    >
      Coming Soon
    </div>
  )
}
