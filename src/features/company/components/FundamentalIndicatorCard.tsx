import { Badge } from "@/components/ui/badge"
import { formatIndicatorValue, type IndicatorDefinition } from "@/features/company/indicators"
import type { CompanyDetailDTO } from "@/features/company/queries"
import { AiIndicatorPopover } from "@/features/company/components/AiIndicatorPopover"

interface FundamentalIndicatorCardProps {
  companyId: string
  indicator: IndicatorDefinition
  dto: CompanyDetailDTO
}

/// The literal embodiment of "never invent, never show zero" — a card
/// always renders for every indicator in the registry; the value only ever
/// comes from indicator.getValue(dto) reading a nullable Prisma column, so
/// there is no code path that can fabricate a number. null renders as "—"
/// plus an "Indisponível" badge, with copy that distinguishes "not synced
/// yet" (sourced) from "no data source exists" (never-available, e.g. Tag
/// Along) — never letting the two look the same to the user.
export function FundamentalIndicatorCard({ companyId, indicator, dto }: FundamentalIndicatorCardProps) {
  const value = indicator.getValue(dto)

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3.5 ring-1 ring-foreground/5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{indicator.label}</span>
        <AiIndicatorPopover
          companyId={companyId}
          indicatorKey={indicator.key}
          indicatorLabel={indicator.label}
          hasValue={value != null}
        />
      </div>
      {value != null ? (
        <span className="text-lg font-semibold tabular-nums">
          {formatIndicatorValue(value, indicator.unit)}
        </span>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold text-muted-foreground/50">—</span>
          <Badge variant="outline" className="text-muted-foreground">
            {indicator.availability === "never-available" ? "Sem fonte" : "Indisponível"}
          </Badge>
        </div>
      )}
    </div>
  )
}
