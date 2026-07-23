/// Company.sector stores BRAPI's raw FactSet economic-sector classification
/// (English, ~21 fixed values) — every query that groups or filters by
/// sector (e.g. getSectorIndicatorAverage) must keep comparing that exact
/// raw string, so this map is display-only: translate at the point a
/// sector reaches the screen or an AI prompt, never in a WHERE clause or a
/// Map key used for bucketing.
const SECTOR_LABELS: Record<string, string> = {
  "Commercial Services": "Serviços Comerciais",
  Communications: "Comunicações",
  "Consumer Durables": "Bens de Consumo Duráveis",
  "Consumer Non-Durables": "Bens de Consumo Não Duráveis",
  "Consumer Services": "Serviços ao Consumidor",
  "Distribution Services": "Serviços de Distribuição",
  "Electronic Technology": "Tecnologia Eletrônica",
  "Energy Minerals": "Petróleo e Gás",
  Finance: "Finanças",
  Government: "Governo",
  "Health Services": "Serviços de Saúde",
  "Health Technology": "Tecnologia da Saúde",
  "Industrial Services": "Serviços Industriais",
  Miscellaneous: "Diversos",
  "Non-Energy Minerals": "Mineração",
  "Process Industries": "Indústria de Processamento",
  "Producer Manufacturing": "Manufatura Industrial",
  "Retail Trade": "Comércio Varejista",
  "Technology Services": "Serviços de Tecnologia",
  Transportation: "Transportes",
  Utilities: "Utilidade Pública",
}

/// Falls back to the raw value for any sector BRAPI adds that isn't in the
/// map yet — never blank/hidden, just untranslated until the map catches up.
export function translateSector(sector: string): string
export function translateSector(sector: string | null): string | null
export function translateSector(sector: string | null): string | null {
  if (sector == null) return null
  return SECTOR_LABELS[sector] ?? sector
}
