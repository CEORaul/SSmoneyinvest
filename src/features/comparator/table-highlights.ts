import { INDICATOR_DEFINITIONS, type IndicatorDefinition, type IndicatorDirection } from "@/features/company/indicators"
import type { CompanyDetailDTO } from "@/features/company/queries"

/// Rows = union of every selected company's own indicator set (a mixed
/// stock+FII comparison shows every stock-only row too, with the FII's
/// cells simply reading "Indisponível"). Shared by ComparisonTable and the
/// CSV export builder so both agree on exactly the same row set — never two
/// slightly different definitions of "which rows this comparison has."
export function getComparisonIndicatorRows(companies: CompanyDetailDTO[]): IndicatorDefinition[] {
  return INDICATOR_DEFINITIONS.filter((indicator) =>
    companies.some((company) => indicator.assetClasses.includes(company.assetClass))
  )
}

export interface RowHighlights {
  /// Index into the original `values` array (including nulls) of the best
  /// value, or null when direction is "neutral" or fewer than 2 companies
  /// have a real (non-null) value for this row.
  bestIndex: number | null
  worstIndex: number | null
  /// Average of only the non-null values — never divides by a count that
  /// includes companies lacking this indicator.
  average: number | null
}

/// Drives the comparison table's per-row best/worst/average tinting.
/// "neutral" direction rows (payout, beta, Preço, Variação, Market Cap, …)
/// are never highlighted — this app doesn't imply which value is "better"
/// when that's genuinely context-dependent or not a quality signal at all.
export function computeRowHighlights(
  values: (number | null)[],
  direction: IndicatorDirection
): RowHighlights {
  if (direction === "neutral") {
    return { bestIndex: null, worstIndex: null, average: null }
  }

  const comparable = values
    .map((value, index) => ({ value, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value != null)

  if (comparable.length < 2) {
    return { bestIndex: null, worstIndex: null, average: null }
  }

  const average = comparable.reduce((sum, entry) => sum + entry.value, 0) / comparable.length

  let best = comparable[0]
  let worst = comparable[0]
  for (const entry of comparable) {
    const better =
      direction === "higher-is-better" ? entry.value > best.value : entry.value < best.value
    const worse =
      direction === "higher-is-better" ? entry.value < worst.value : entry.value > worst.value
    if (better) best = entry
    if (worse) worst = entry
  }

  return { bestIndex: best.index, worstIndex: worst.index, average }
}
