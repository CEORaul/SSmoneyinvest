import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getIndicatorDisplay } from "@/features/company/indicators"
import type { CompanyDetailDTO } from "@/features/company/queries"
import { AiIndicatorPopover } from "@/features/company/components/AiIndicatorPopover"

interface FundamentalIndicatorCardProps {
  companyId: string
  indicatorKey: string
  dto: CompanyDetailDTO
}

/// The literal embodiment of "never invent, never show zero" — a card
/// always renders for every indicator in the registry; the value only ever
/// comes from getIndicatorDisplay (indicator.getValue(dto) reading a
/// nullable Prisma column, or an exact arithmetic combination of two such
/// columns — never fetched or fabricated here). null renders as "—" plus an
/// "Indisponível" badge, with copy that distinguishes "not synced yet"
/// (sourced) from "no data source exists" (never-available, e.g. Tag Along)
/// — never letting the two look the same to the user. The hover tooltip
/// (indicator.description) is a static, no-cost explanation — the separate
/// AI popover stays for a deeper, ticker-specific reading, but understanding
/// what an indicator even means never requires an AI call. This is the one
/// place that needs its own layout rather than the generic FinancialMetric
/// (see metrics/), since it has a header slot for the AI popover button.
export function FundamentalIndicatorCard({ companyId, indicatorKey, dto }: FundamentalIndicatorCardProps) {
  const resolved = getIndicatorDisplay(dto, indicatorKey)
  if (!resolved) return null
  const { definition, value, formatted } = resolved

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3.5 ring-1 ring-foreground/5">
      <div className="flex items-center justify-between gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="cursor-default text-xs font-medium text-muted-foreground underline decoration-dotted underline-offset-2" />
            }
          >
            {definition.label}
          </TooltipTrigger>
          <TooltipContent>{definition.description}</TooltipContent>
        </Tooltip>
        <AiIndicatorPopover
          companyId={companyId}
          indicatorKey={definition.key}
          indicatorLabel={definition.label}
          hasValue={value != null}
        />
      </div>
      {formatted != null ? (
        <span className="text-lg font-semibold tabular-nums">{formatted}</span>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold text-muted-foreground/50">—</span>
          <Badge variant="outline" className="text-muted-foreground">
            {definition.availability === "never-available" ? "Sem fonte" : "Indisponível"}
          </Badge>
        </div>
      )}
    </div>
  )
}
