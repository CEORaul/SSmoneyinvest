import type { WatchlistFilters, WatchlistItemRow, WatchlistSortOption } from "@/features/watchlist/types"

/// Pure client-side filter+sort over an already-loaded item list — a
/// personal watchlist realistically holds dozens to a few hundred assets,
/// never enough to justify a server round trip for every keystroke/sort
/// change (unlike /mercado's URL-driven, DB-level filtering over the whole
/// market). No I/O, easy to reason about, easy to test.
export function filterWatchlistItems(
  items: WatchlistItemRow[],
  filters: WatchlistFilters,
  search: string
): WatchlistItemRow[] {
  const query = search.trim().toLowerCase()

  return items.filter((item) => {
    if (query && !item.ticker.toLowerCase().includes(query) && !item.name.toLowerCase().includes(query)) {
      return false
    }
    if (filters.assetClass !== "TODOS" && item.assetClass !== filters.assetClass) return false
    if (filters.sector && item.sector !== filters.sector) return false
    if (filters.precoMinCents != null && item.priceCents < filters.precoMinCents) return false
    if (filters.precoMaxCents != null && item.priceCents > filters.precoMaxCents) return false
    if (filters.pagadoraDividendos && item.dividendYieldPct <= 0) return false
    return true
  })
}

function numberOrZero(value: bigint | null): number {
  return value == null ? 0 : Number(value)
}

export function sortWatchlistItems(items: WatchlistItemRow[], sort: WatchlistSortOption): WatchlistItemRow[] {
  const sorted = [...items]

  switch (sort) {
    case "preco-desc":
      return sorted.sort((a, b) => b.priceCents - a.priceCents)
    case "preco-asc":
      return sorted.sort((a, b) => a.priceCents - b.priceCents)
    case "variacao-desc":
      return sorted.sort((a, b) => b.dailyChangePct - a.dailyChangePct)
    case "variacao-asc":
      return sorted.sort((a, b) => a.dailyChangePct - b.dailyChangePct)
    case "dy-desc":
      return sorted.sort((a, b) => b.dividendYieldPct - a.dividendYieldPct)
    case "dy-asc":
      return sorted.sort((a, b) => a.dividendYieldPct - b.dividendYieldPct)
    case "nome":
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case "ticker":
      return sorted.sort((a, b) => a.ticker.localeCompare(b.ticker))
    case "marketcap-desc":
      return sorted.sort((a, b) => numberOrZero(b.marketCapCents) - numberOrZero(a.marketCapCents))
    case "marketcap-asc":
      return sorted.sort((a, b) => numberOrZero(a.marketCapCents) - numberOrZero(b.marketCapCents))
    case "volume-desc":
      return sorted.sort((a, b) => numberOrZero(b.volume) - numberOrZero(a.volume))
    case "classe":
      return sorted.sort((a, b) => a.assetClass.localeCompare(b.assetClass))
    case "setor":
      return sorted.sort((a, b) => (a.sector ?? "").localeCompare(b.sector ?? ""))
    default:
      return sorted
  }
}
