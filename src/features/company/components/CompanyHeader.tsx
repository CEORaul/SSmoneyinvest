import { ArrowRightLeft } from "lucide-react"
import Link from "next/link"

import { PriceChangeTag } from "@/components/shared/PriceChangeTag"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import type { TradeCompany } from "@/features/portfolio/components/TradeDialog"
import type { CompanyDetailDTO } from "@/features/company/queries"
import { CompanyHeaderActions } from "@/features/company/components/CompanyHeaderActions"
import { formatCompactNumber, formatCurrencyCents, formatCurrencyCentsCompact } from "@/utils/format"

interface CompanyHeaderProps {
  dto: CompanyDetailDTO
  tradeCompany: TradeCompany
  initialFavorited: boolean
  isAuthenticated: boolean
}

export function CompanyHeader({ dto, tradeCompany, initialFavorited, isAuthenticated }: CompanyHeaderProps) {
  const category = getAssetCategoryMeta(dto.assetClass)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <TickerBadge ticker={dto.ticker} logoUrl={dto.logoUrl} size="lg" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{dto.ticker}</h1>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {category.emoji} {category.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{dto.name}</p>
            {(dto.sector || dto.segment) && (
              <p className="text-xs text-muted-foreground">
                {[dto.sector, dto.segment].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="text-3xl font-semibold tabular-nums">
            {formatCurrencyCents(dto.priceCents)}
          </span>
          <PriceChangeTag changePct={dto.priceChangePct} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 text-sm">
        {dto.volume != null && (
          <span className="text-muted-foreground">
            Volume <span className="font-medium text-foreground">{formatCompactNumber(dto.volume)}</span>
          </span>
        )}
        {dto.marketCapCents != null && (
          <span className="text-muted-foreground">
            Market Cap{" "}
            <span className="font-medium text-foreground">{formatCurrencyCentsCompact(dto.marketCapCents)}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CompanyHeaderActions
          company={tradeCompany}
          initialFavorited={initialFavorited}
          isAuthenticated={isAuthenticated}
        />
        <Link
          href={`/comparar?tickers=${dto.ticker}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowRightLeft className="size-4" />
          Comparar
        </Link>
      </div>
    </div>
  )
}
