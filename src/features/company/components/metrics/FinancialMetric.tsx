import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getIndicatorDisplay, type CompanyMetricsSource } from "@/features/company/indicators"
import { cn } from "@/lib/utils"

interface FinancialMetricBaseProps {
  /// "card" (default) renders its own bordered tile, matching
  /// FundamentalIndicatorCard's chrome — used in grids. "inline" renders
  /// just the label+value pair with no border, for embedding inside a
  /// parent's own layout (a table cell, a summary row, a card someone else
  /// already drew the border for).
  variant?: "card" | "inline"
  size?: "sm" | "md"
  className?: string
}

type FinancialMetricProps =
  | (FinancialMetricBaseProps & {
      /// The common case — looks up indicatorKey in the shared registry and
      /// resolves it straight off the company's own data (full DTO, or any
      /// narrower query result that already carries stock/fii/etf).
      dto: CompanyMetricsSource
      indicatorKey: string
    })
  | (FinancialMetricBaseProps & {
      /// The aggregate case (e.g. Carteira's "P/L médio") — there's no
      /// single company DTO to look up, so the caller supplies an
      /// already-computed value plus the same label/description/unit shape
      /// a registry entry would have. Still renders identically to the dto
      /// case — one visual system either way.
      dto?: undefined
      label: string
      description: string
      formatted: string | null
    })

/// The one atomic label+value+tooltip unit every metric surface in the app
/// (Fundamentos grid, Carteira aggregates, Mercado/Radar/Notícias/Busca
/// quick stats) renders through — see IndicatorBadge/CompanyQuickStats/
/// FinancialHighlights/FinancialMetricGrid, all built on top of this same
/// component rather than re-implementing label+tooltip+value markup.
export function FinancialMetric(props: FinancialMetricProps) {
  const variant = props.variant ?? "card"
  const size = props.size ?? "md"

  const resolved =
    "dto" in props && props.dto
      ? getIndicatorDisplay(props.dto, props.indicatorKey)
      : "label" in props
        ? { definition: null, value: null, formatted: props.formatted }
        : null
  if (!resolved) return null

  const label = resolved.definition?.label ?? (props as { label: string }).label
  const description = resolved.definition?.description ?? (props as { description: string }).description
  const isNeverAvailable = resolved.definition?.availability === "never-available"

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        variant === "card" && "rounded-xl border border-border bg-card p-3.5 ring-1 ring-foreground/5",
        props.className
      )}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={cn(
                "w-fit cursor-default font-medium text-muted-foreground underline decoration-dotted underline-offset-2",
                size === "sm" ? "text-[11px]" : "text-xs"
              )}
            />
          }
        >
          {label}
        </TooltipTrigger>
        <TooltipContent>{description}</TooltipContent>
      </Tooltip>
      {resolved.formatted != null ? (
        <span className={cn("font-semibold tabular-nums", size === "sm" ? "text-sm" : "text-lg")}>
          {resolved.formatted}
        </span>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className={cn("font-semibold text-muted-foreground/50", size === "sm" ? "text-sm" : "text-lg")}>
            —
          </span>
          {variant === "card" && (
            <Badge variant="outline" className="text-muted-foreground">
              {isNeverAvailable ? "Sem fonte" : "Indisponível"}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
