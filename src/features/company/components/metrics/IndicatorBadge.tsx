import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getIndicatorDisplay, type CompanyMetricsSource } from "@/features/company/indicators"

interface IndicatorBadgeProps {
  dto: CompanyMetricsSource
  indicatorKey: string
  /// Renders nothing at all when the value is unavailable, rather than an
  /// empty "—" pill — appropriate for dense rows (Radar/Notícias/Busca)
  /// stringing several badges together, where a run of "—" pills would be
  /// noisier than just showing the badges that do have data. This is a
  /// display-density choice, not a "hide indisponível" one: the same
  /// indicator always has a real, non-hidden home in the Fundamentos grid
  /// via FinancialMetric — this component just never claims to be that
  /// exhaustive view.
  hideWhenUnavailable?: boolean
}

/// The compact pill variant for dense contexts — "P/L 8,45" as one small
/// inline chip, several strung together in a row (see CompanyQuickStats).
/// Shares the exact same (dto, key) → value/tooltip resolution as
/// FinancialMetric; only the visual footprint differs.
export function IndicatorBadge({ dto, indicatorKey, hideWhenUnavailable = true }: IndicatorBadgeProps) {
  const resolved = getIndicatorDisplay(dto, indicatorKey)
  if (!resolved) return null
  if (resolved.formatted == null && hideWhenUnavailable) return null

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] whitespace-nowrap" />
        }
      >
        <span className="text-muted-foreground">{resolved.definition.label}</span>
        <span className="font-semibold tabular-nums">{resolved.formatted ?? "—"}</span>
      </TooltipTrigger>
      <TooltipContent>{resolved.definition.description}</TooltipContent>
    </Tooltip>
  )
}
