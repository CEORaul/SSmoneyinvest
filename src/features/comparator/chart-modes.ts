export type ComparisonViewMode =
  | "PRICE"
  | "RETURN_PCT"
  | "DIVIDENDS_ACCUMULATED"
  | "INVESTED"
  | "CURRENT_VALUE"
  | "PROFIT"

export const VIEW_MODE_LABELS: Record<ComparisonViewMode, string> = {
  PRICE: "Preço",
  RETURN_PCT: "Rentabilidade %",
  DIVIDENDS_ACCUMULATED: "Dividendos acumulados",
  INVESTED: "Valor investido",
  CURRENT_VALUE: "Valor atual",
  PROFIT: "Lucro",
}

/// The three modes that only mean anything for an asset the signed-in user
/// actually holds — an unheld asset (or an anonymous visitor) renders "Sem
/// posição" for that series rather than a fabricated zero/flat line.
const POSITION_DEPENDENT_MODES: ComparisonViewMode[] = ["INVESTED", "CURRENT_VALUE", "PROFIT"]

export function isPositionDependentMode(mode: ComparisonViewMode): boolean {
  return POSITION_DEPENDENT_MODES.includes(mode)
}

export interface RawPricePoint {
  date: string
  closeCents: number
}

export interface RawDividendPoint {
  exDate: string
  amountPerShare: number
}

export interface SeriesInput {
  companyId: string
  ticker: string
  color: string
  pricePoints: RawPricePoint[]
  dividendPoints: RawDividendPoint[]
  /// null/undefined = not held by the signed-in user (or no user signed in).
  position: { quantity: number; investedCents: number } | null
}

export interface ModeSeriesPoint {
  date: string
  value: number | null
}

export interface ModeSeries {
  companyId: string
  ticker: string
  color: string
  points: ModeSeriesPoint[]
  /// Set when this mode has nothing real to show for this company (e.g.
  /// a position-dependent mode for an asset the user doesn't hold) — the
  /// chart renders this as an explanatory legend note, never a fake line.
  unavailableReason?: string
}

/// The one place every view mode's numbers come from — each branch reads
/// only fields already fetched from Postgres (price history, dividend
/// history, the user's own position), never invents or estimates a value.
export function computeViewModeSeries(input: SeriesInput, mode: ComparisonViewMode): ModeSeries {
  const base = { companyId: input.companyId, ticker: input.ticker, color: input.color }

  if (mode === "PRICE") {
    return { ...base, points: input.pricePoints.map((p) => ({ date: p.date, value: p.closeCents })) }
  }

  if (mode === "RETURN_PCT") {
    const first = input.pricePoints[0]?.closeCents
    if (first == null || first === 0) return { ...base, points: [] }
    return {
      ...base,
      points: input.pricePoints.map((p) => ({
        date: p.date,
        value: ((p.closeCents - first) / first) * 100,
      })),
    }
  }

  if (mode === "DIVIDENDS_ACCUMULATED") {
    const sortedDividends = [...input.dividendPoints].sort((a, b) => a.exDate.localeCompare(b.exDate))
    let cumulative = 0
    let dividendIndex = 0
    const points = input.pricePoints.map((p) => {
      while (
        dividendIndex < sortedDividends.length &&
        sortedDividends[dividendIndex].exDate <= p.date
      ) {
        cumulative += sortedDividends[dividendIndex].amountPerShare
        dividendIndex += 1
      }
      return { date: p.date, value: cumulative }
    })
    return { ...base, points }
  }

  // INVESTED / CURRENT_VALUE / PROFIT — position-dependent.
  if (!input.position) {
    return { ...base, points: [], unavailableReason: "Sem posição neste ativo" }
  }
  const { quantity, investedCents } = input.position

  if (mode === "INVESTED") {
    return { ...base, points: input.pricePoints.map((p) => ({ date: p.date, value: investedCents })) }
  }
  if (mode === "CURRENT_VALUE") {
    return {
      ...base,
      points: input.pricePoints.map((p) => ({ date: p.date, value: p.closeCents * quantity })),
    }
  }
  // PROFIT
  return {
    ...base,
    points: input.pricePoints.map((p) => ({ date: p.date, value: p.closeCents * quantity - investedCents })),
  }
}

export interface MergedPoint {
  date: string
  [companyId: string]: string | number | null
}

/// Merges N per-company point arrays onto one shared date axis so recharts
/// can plot every series off a single data array. A company missing a given
/// date (thinner history, later IPO, etc.) gets `null` for that date — a
/// gap in its line, never an interpolated/fabricated value.
export function mergeSeriesByDate(series: ModeSeries[]): MergedPoint[] {
  const allDates = new Set<string>()
  for (const s of series) {
    for (const point of s.points) allDates.add(point.date)
  }
  const sortedDates = [...allDates].sort()

  return sortedDates.map((date) => {
    const row: MergedPoint = { date }
    for (const s of series) {
      const point = s.points.find((p) => p.date === date)
      row[s.companyId] = point?.value ?? null
    }
    return row
  })
}
