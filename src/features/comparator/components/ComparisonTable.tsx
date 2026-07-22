import { ArrowDown, ArrowUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { PriceChangeTag } from "@/components/shared/PriceChangeTag"
import { AiIndicatorPopover } from "@/features/company/components/AiIndicatorPopover"
import { formatIndicatorValue, type IndicatorDefinition } from "@/features/company/indicators"
import type { CompanyDetailDTO } from "@/features/company/queries"
import { computeRowHighlights, getComparisonIndicatorRows } from "@/features/comparator/table-highlights"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatCurrencyCentsCompact } from "@/utils/format"

interface ComparisonTableProps {
  companies: CompanyDetailDTO[]
  /// Optional so this table degrades gracefully if ever rendered without a
  /// chart alongside it — when present, the same dot color used for that
  /// company's line ties the two together (color follows entity identity
  /// across both components, never assigned twice).
  colors?: Map<string, { color: string }>
}

function HighlightMark({ kind }: { kind: "best" | "worst" }) {
  const Icon = kind === "best" ? ArrowUp : ArrowDown
  return (
    <Icon className={cn("inline size-3", kind === "best" ? "text-gain" : "text-loss")} aria-hidden />
  )
}

function IndicatorRow({ indicator, companies }: { indicator: IndicatorDefinition; companies: CompanyDetailDTO[] }) {
  const values = companies.map((c) => indicator.getValue(c))
  const { bestIndex, worstIndex, average } = computeRowHighlights(values, indicator.direction)

  return (
    <tr className="border-b border-border">
      <th
        scope="row"
        className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap"
      >
        {indicator.label}
      </th>
      <td className="px-3 py-2.5 text-center text-xs text-muted-foreground tabular-nums">
        {average != null ? formatIndicatorValue(average, indicator.unit) : "—"}
      </td>
      {companies.map((company, index) => {
        const value = values[index]
        const isBest = bestIndex === index
        const isWorst = worstIndex === index
        return (
          <td
            key={company.id}
            className={cn(
              "px-3 py-2.5 text-center tabular-nums",
              isBest && "bg-gain/10",
              isWorst && "bg-loss/10"
            )}
          >
            {value != null ? (
              <span className="inline-flex items-center justify-center gap-2">
                {isBest && <HighlightMark kind="best" />}
                <span className={cn("font-semibold", isBest && "text-gain", isWorst && "text-loss")}>
                  {formatIndicatorValue(value, indicator.unit)}
                </span>
                {isWorst && <HighlightMark kind="worst" />}
                <AiIndicatorPopover
                  companyId={company.id}
                  indicatorKey={indicator.key}
                  indicatorLabel={indicator.label}
                  hasValue
                />
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="text-muted-foreground/50">—</span>
                <Badge variant="outline" className="text-muted-foreground">
                  {indicator.availability === "never-available" ? "Sem fonte" : "Indisponível"}
                </Badge>
                <AiIndicatorPopover
                  companyId={company.id}
                  indicatorKey={indicator.key}
                  indicatorLabel={indicator.label}
                  hasValue={false}
                />
              </span>
            )}
          </td>
        )
      })}
    </tr>
  )
}

/// Rows = union of every selected company's own indicator set — a mixed
/// stock+FII comparison shows every stock-only row too, with the FII's cells
/// simply reading "Indisponível" for them (indicator.getValue already
/// returns null via optional chaining for a category it doesn't apply to;
/// this table never invents a separate "not applicable" state, it reuses the
/// exact same null handling the individual company page already has).
export function ComparisonTable({ companies, colors }: ComparisonTableProps) {
  const rows = getComparisonIndicatorRows(companies)

  const priceValues = companies.map((c) => c.priceCents)
  const marketCapValues = companies.map((c) => (c.marketCapCents != null ? Number(c.marketCapCents) : null))
  const marketCapHighlights = computeRowHighlights(marketCapValues, "neutral")

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-20 bg-card">
          <tr className="border-b border-border">
            <th scope="col" className="sticky left-0 z-30 bg-card px-3 py-3 text-left font-medium whitespace-nowrap">
              Indicador
            </th>
            <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">
              Média
            </th>
            {companies.map((company) => (
              <th key={company.id} scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: colors?.get(company.id)?.color }}
                  />
                  <TickerBadge ticker={company.ticker} logoUrl={company.logoUrl} size="sm" />
                  <span className="font-semibold">{company.ticker}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap">
              Preço
            </th>
            <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">—</td>
            {companies.map((company) => (
              <td key={company.id} className="px-3 py-2.5 text-center font-semibold tabular-nums">
                {formatCurrencyCents(company.priceCents)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap">
              Variação
            </th>
            <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">—</td>
            {companies.map((company, index) => (
              <td key={company.id} className="px-3 py-2.5 text-center">
                <PriceChangeTag changePct={priceValues[index] != null ? company.priceChangePct : 0} className="justify-center" />
              </td>
            ))}
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap">
              Market Cap
            </th>
            <td className="px-3 py-2.5 text-center text-xs text-muted-foreground tabular-nums">
              {marketCapHighlights.average != null ? formatCurrencyCentsCompact(marketCapHighlights.average * 100) : "—"}
            </td>
            {companies.map((company) => (
              <td key={company.id} className="px-3 py-2.5 text-center font-semibold tabular-nums">
                {company.marketCapCents != null ? formatCurrencyCentsCompact(company.marketCapCents) : "—"}
              </td>
            ))}
          </tr>

          {rows.map((indicator) => (
            <IndicatorRow key={indicator.key} indicator={indicator} companies={companies} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
