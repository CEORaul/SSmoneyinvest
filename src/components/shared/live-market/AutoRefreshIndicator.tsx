import { MARKET_REFRESH_LABEL } from "@/lib/market-refresh/config"
import { cn } from "@/lib/utils"

interface AutoRefreshIndicatorProps {
  className?: string
}

/// The spec's own literal copy — "🟢 Atualização automática a cada 5
/// minutos" — reads its interval from the single centralized config
/// (market-refresh/config.ts), so switching the whole app to 1min/15min/
/// tempo real never touches this file. Purely decorative, no state, no
/// hooks — safe to render directly from a Server Component.
export function AutoRefreshIndicator({ className }: AutoRefreshIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <span aria-hidden>🟢</span>
      {MARKET_REFRESH_LABEL}
    </span>
  )
}
