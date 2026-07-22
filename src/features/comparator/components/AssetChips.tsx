"use client"

import { X } from "lucide-react"

import { TickerBadge } from "@/components/shared/TickerBadge"
import { cn } from "@/lib/utils"

export interface AssetChip {
  ticker: string
  name: string
  logoUrl: string | null
}

interface AssetChipsProps {
  companies: AssetChip[]
  onRemove: (ticker: string) => void
  colors?: Map<string, { color: string }>
  /// Keyed by ticker (not companyId) since colors are assigned by
  /// companyId — the caller passes a companyId-keyed map plus this
  /// ticker→companyId lookup so a chip's dot always matches its chart line.
  tickerToCompanyId?: Map<string, string>
}

/// Removable chips row — e.g. "PETR4 ✕" — driving the /comparar URL's
/// ?tickers= state. Read-only display data (ticker/name/logo) plus the same
/// color dot used by the chart/table, so removing or re-adding a chip is
/// visibly tied to the same identity everywhere on the page.
export function AssetChips({ companies, onRemove, colors, tickerToCompanyId }: AssetChipsProps) {
  if (companies.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {companies.map((company) => {
        const companyId = tickerToCompanyId?.get(company.ticker)
        const color = companyId ? colors?.get(companyId)?.color : undefined
        return (
          <span
            key={company.ticker}
            className={cn(
              "flex items-center gap-2 rounded-full border border-border bg-card py-1 pr-1 pl-2 text-sm"
            )}
          >
            {color && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
            <TickerBadge ticker={company.ticker} logoUrl={company.logoUrl} size="sm" />
            <span className="font-medium">{company.ticker}</span>
            <button
              type="button"
              onClick={() => onRemove(company.ticker)}
              aria-label={`Remover ${company.ticker} da comparação`}
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </span>
        )
      })}
    </div>
  )
}
