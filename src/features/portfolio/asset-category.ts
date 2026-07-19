import type { AssetClass } from "@/generated/prisma/client"

/// Single source of truth for everything category-shaped in the portfolio
/// UI — label, emoji, display order, and whether a real market-data source
/// exists for it yet. Adding a new category (a real one, once wired to a
/// provider, or another manual-only one) means adding one entry here; nothing
/// else in the app should ever branch on AssetClass with a scattered if/switch.
export interface AssetCategoryMeta {
  value: AssetClass
  label: string
  emoji: string
  order: number
  /// False for categories with no market-data provider connected yet
  /// (Cripto, Renda Fixa, Outros) — search/autocomplete and automatic
  /// historical-price lookup are unavailable, and trades for these
  /// categories always require the manual price override.
  hasMarketData: boolean
}

export const ASSET_CATEGORIES: readonly AssetCategoryMeta[] = [
  { value: "STOCK", label: "Ações", emoji: "📈", order: 1, hasMarketData: true },
  { value: "FII", label: "FIIs", emoji: "🏢", order: 2, hasMarketData: true },
  { value: "ETF", label: "ETFs", emoji: "📊", order: 3, hasMarketData: true },
  { value: "BDR", label: "BDRs", emoji: "🌎", order: 4, hasMarketData: true },
  { value: "CRYPTO", label: "Criptomoedas", emoji: "🪙", order: 5, hasMarketData: false },
  { value: "FIXED_INCOME", label: "Renda Fixa", emoji: "💵", order: 6, hasMarketData: false },
  { value: "OTHER", label: "Outros Investimentos", emoji: "⭐", order: 7, hasMarketData: false },
]

const BY_VALUE = new Map(ASSET_CATEGORIES.map((category) => [category.value, category]))

export function getAssetCategoryMeta(value: AssetClass): AssetCategoryMeta {
  const meta = BY_VALUE.get(value)
  if (!meta) throw new Error(`Categoria de ativo desconhecida: ${value}`)
  return meta
}

export function sortByAssetCategoryOrder<T extends { value: AssetClass }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => getAssetCategoryMeta(a.value).order - getAssetCategoryMeta(b.value).order
  )
}
