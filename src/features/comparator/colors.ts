/// 8 categorical hues, fixed order, validated with the dataviz skill's
/// validate_palette.js against both surfaces (light #fcfcfb / dark #1a1a19):
/// CVD adjacent ΔE 9.1 light / 8.4 dark (>=8 target), normal-vision floor
/// 19.6 / 19.3 (>=15 floor) — see globals.css `--comparator-series-1..8` for
/// the actual per-theme hex (light/dark swap is handled there, not here, so
/// this module never needs to know which theme is active).
const SERIES_SLOT_COUNT = 8

export const ASSET_COLORS: string[] = Array.from(
  { length: SERIES_SLOT_COUNT },
  (_, i) => `var(--comparator-series-${i + 1})`
)

export interface AssetColorAssignment {
  color: string
  /// True only past the 8th selected asset. The dataviz skill's rule is
  /// explicit: a 9th categorical series is never a generated hue — it folds
  /// into a composite encoding instead. Here that means reusing an earlier
  /// slot's hue with a dashed stroke, so identity is still carried by hue +
  /// pattern rather than a fabricated 9th/10th color.
  dashed: boolean
}

/// Stable, order-based: a company's color/pattern is derived from its
/// position in the input array only, so hiding one chip never shifts the
/// colors of the others (color follows entity identity, never rank).
export function assignColors(companyIds: string[]): Map<string, AssetColorAssignment> {
  const assignments = new Map<string, AssetColorAssignment>()
  companyIds.forEach((companyId, index) => {
    const slot = index % SERIES_SLOT_COUNT
    assignments.set(companyId, {
      color: ASSET_COLORS[slot],
      dashed: index >= SERIES_SLOT_COUNT,
    })
  })
  return assignments
}
