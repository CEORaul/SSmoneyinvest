import { getIndicatorsForAssetClass } from "@/features/company/indicators"
import type { CompanyDetailDTO } from "@/features/company/queries"

export interface DataCoverageChecklistItem {
  label: string
  ok: boolean
}

export interface DataCoverage {
  pct: number
  checklist: DataCoverageChecklistItem[]
}

export interface DataCoverageExtras {
  priceHistoryCount: number
  dividendHistoryCount: number
}

/// Computed fresh on every render — cheap arithmetic over an already-loaded
/// DTO, so there's never a stale coverage number to worry about caching.
/// "never-available" indicators (Tag Along, Fluxo de Caixa) are excluded
/// from both numerator and denominator: they aren't a data-quality gap for
/// THIS asset, they're permanently out of scope, and counting them would
/// put a misleading ceiling on the percentage every asset would hit.
export function computeDataCoverage(
  dto: CompanyDetailDTO,
  extras: DataCoverageExtras
): DataCoverage {
  const sourced = getIndicatorsForAssetClass(dto.assetClass).filter(
    (indicator) => indicator.availability === "sourced"
  )
  const populated = sourced.filter((indicator) => indicator.getValue(dto) != null)
  const pct = sourced.length === 0 ? 100 : Math.round((100 * populated.length) / sourced.length)

  const checklist: DataCoverageChecklistItem[] = [
    { label: "Cotação", ok: dto.priceCents > 0 },
    { label: "Histórico", ok: extras.priceHistoryCount > 0 },
    { label: "Dividendos", ok: extras.dividendHistoryCount > 0 },
    { label: "Market Cap", ok: dto.marketCapCents != null },
    { label: "Volume", ok: dto.volume != null },
  ]

  if (sourced.length > 0 && pct < 100) {
    checklist.push({ label: "Alguns indicadores fundamentalistas indisponíveis nesta fonte", ok: false })
  }

  return { pct, checklist }
}
