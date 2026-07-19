import type { PortfolioPositionRow } from "@/features/portfolio/queries"

export type SortKey = "ticker" | "value" | "profit" | "dividends" | "allocation"

export const SORT_LABELS: Record<SortKey, string> = {
  ticker: "Ticker/Empresa",
  value: "Valor",
  profit: "Rentabilidade",
  dividends: "Dividendos",
  allocation: "Participação",
}

export function sortPositions(
  positions: PortfolioPositionRow[],
  key: SortKey,
  direction: "asc" | "desc"
): PortfolioPositionRow[] {
  const sorted = [...positions].sort((a, b) => {
    switch (key) {
      case "ticker":
        return a.ticker.localeCompare(b.ticker)
      case "value":
        return a.currentValueCents - b.currentValueCents
      case "profit":
        return a.profitPct - b.profitPct
      case "dividends":
        return a.dividendsReceivedCents - b.dividendsReceivedCents
      case "allocation":
        return a.allocationPct - b.allocationPct
    }
  })
  return direction === "asc" ? sorted : sorted.reverse()
}
