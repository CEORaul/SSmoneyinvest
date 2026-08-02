export type HistoricoMetric = "RECEITA" | "LUCRO" | "PATRIMONIO" | "DIVIDENDOS" | "ROE" | "MARGENS" | "FLUXO_CAIXA"

export interface HistoricoSeriesPoint {
  date: string
  value: number | null
}

export interface HistoricoSeries {
  id: string
  label: string
  points: HistoricoSeriesPoint[]
}
