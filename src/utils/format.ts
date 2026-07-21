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

export function formatRelativeTime(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 10) return "agora"
  if (seconds < 60) return `há ${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.round(hours / 24)}d`
}

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

export function formatAbsoluteTime(date: Date): string {
  return timeFormatter.format(date)
}
