import Link from "next/link"

import { PriceChangeTag } from "@/components/shared/PriceChangeTag"
import { TickerBadge } from "@/components/shared/TickerBadge"
import type { CompanyListItem } from "@/types"
import { formatCurrencyCents } from "@/utils/format"

interface CompanyCardProps {
  company: CompanyListItem
  metric?: "change" | "dividendYield"
}

export function CompanyCard({ company, metric = "change" }: CompanyCardProps) {
  return (
    <Link
      href={`/empresa/${company.ticker}`}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <TickerBadge ticker={company.ticker} logoUrl={company.logoUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{company.ticker}</p>
        <p className="truncate text-xs text-muted-foreground">{company.name}</p>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-sm font-medium tabular-nums">
          {formatCurrencyCents(company.priceCents)}
        </span>
        {metric === "change" ? (
          <PriceChangeTag changePct={company.changePct} />
        ) : (
          <span className="text-sm font-medium tabular-nums text-gain">
            {company.dividendYield.toFixed(2).replace(".", ",")}%
          </span>
        )}
      </div>
    </Link>
  )
}
