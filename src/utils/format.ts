const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
})

const compactNumberFormatter = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function formatCurrencyCents(cents: number | bigint): string {
  const value = Number(cents) / 100
  return currencyFormatter.format(value)
}

export function formatPercent(value: number | string): string {
  const numeric = typeof value === "string" ? Number(value) : value
  return percentFormatter.format(numeric / 100)
}

export function formatCompactNumber(value: number | bigint): string {
  return compactNumberFormatter.format(Number(value))
}

export function formatTicker(ticker: string): string {
  return ticker.toUpperCase()
}
