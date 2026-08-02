import type { AssetClass } from "@/generated/prisma/client"
import type { CompanyDetailDTO } from "@/features/company/queries"

export type IndicatorUnit = "ratio" | "percent" | "currency" | "count" | "years"

/// Which direction of this indicator's value counts as "better" — drives the
/// comparator's best/worst highlighting (table-highlights.ts). "neutral"
/// covers indicators where higher/lower isn't a quality signal at all
/// (payout, beta, share count) or is genuinely context-dependent enough that
/// this app shouldn't imply advice by coloring it green/red.
export type IndicatorDirection = "higher-is-better" | "lower-is-better" | "neutral"

/// Groups the Fundamentos grid into labeled subsections (Valuation,
/// Rentabilidade, ...) — purely a display grouping, has no effect on
/// coverage/comparator logic, which both key off the flat array.
export type IndicatorCategory =
  | "Valuation"
  | "Rentabilidade"
  | "Margens"
  | "Dividendos"
  | "Endividamento"
  | "Crescimento"
  | "Resultados"
  | "Estrutura"

export const INDICATOR_CATEGORY_ORDER: IndicatorCategory[] = [
  "Valuation",
  "Rentabilidade",
  "Margens",
  "Dividendos",
  "Endividamento",
  "Crescimento",
  "Resultados",
  "Estrutura",
]

export interface IndicatorDefinition {
  key: string
  label: string
  unit: IndicatorUnit
  category: IndicatorCategory
  /// One-sentence plain-language explanation shown in the card's hover
  /// tooltip — separate from the "Explicações de IA" popover, which stays
  /// available for a deeper, ticker-specific reading. This is the part that
  /// must never require an AI call just to know what the indicator means.
  description: string
  assetClasses: AssetClass[]
  /// "sourced": a real provider could populate this (null today just means
  /// no sync has produced it yet — counts against data coverage). "never-
  /// available": no data source exists for this at all (Tag Along) —
  /// excluded from coverage entirely so it never puts a permanent ceiling
  /// on the percentage.
  availability: "sourced" | "never-available"
  direction: IndicatorDirection
  getValue(dto: CompanyDetailDTO): number | null
}

const STOCK_AND_BDR: AssetClass[] = ["STOCK", "BDR"]

/// One array drives everything: which cards render for a given asset, the
/// coverage %, and — critically — the ONLY way a card's value is ever
/// produced (straight off the DTO's nullable Prisma columns via getValue, or
/// an exact arithmetic combination of two already-populated columns — never
/// a fetched or fabricated number). No component ever computes an indicator
/// from raw numbers itself, so there is no path to inventing a value that
/// isn't already in the database.
export const INDICATOR_DEFINITIONS: IndicatorDefinition[] = [
  {
    key: "priceToEarnings",
    label: "P/L",
    unit: "ratio",
    category: "Valuation",
    description: "Preço da ação dividido pelo lucro por ação — quantos anos de lucro atual custaria comprar a empresa hoje.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "lower-is-better",
    getValue: (d) => d.stock?.priceToEarnings ?? null,
  },
  {
    key: "priceToBook",
    label: "P/VP",
    unit: "ratio",
    category: "Valuation",
    description: "Preço da ação dividido pelo valor patrimonial por ação — compara o preço de mercado ao patrimônio contábil da empresa.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "lower-is-better",
    getValue: (d) => d.stock?.priceToBook ?? null,
  },
  {
    key: "psr",
    label: "PSR",
    unit: "ratio",
    category: "Valuation",
    description: "Preço sobre vendas — valor de mercado dividido pela receita anual, útil para comparar empresas ainda sem lucro consistente.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "lower-is-better",
    getValue: (d) => d.stock?.psr ?? null,
  },
  {
    key: "enterpriseValue",
    label: "EV",
    unit: "currency",
    category: "Valuation",
    description: "Enterprise Value — valor de mercado somado à dívida líquida, o preço teórico de comprar a empresa inteira já quitando suas dívidas.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "neutral",
    // Identidade contábil exata (EV = Market Cap + Dívida Líquida), não uma
    // estimativa — ambos os campos já chegam nesta mesma consulta.
    getValue: (d) =>
      d.marketCapCents != null && d.stock?.netDebtCents != null
        ? Number(d.marketCapCents) / 100 + Number(d.stock.netDebtCents) / 100
        : null,
  },
  {
    key: "evToEbit",
    label: "EV/EBIT",
    unit: "ratio",
    category: "Valuation",
    description: "Enterprise Value dividido pelo EBIT — quantos anos de lucro operacional pagariam o valor total da empresa.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "lower-is-better",
    getValue: (d) => d.stock?.evToEbit ?? null,
  },
  {
    key: "evToEbitda",
    label: "EV/EBITDA",
    unit: "ratio",
    category: "Valuation",
    description: "Enterprise Value dividido pelo EBITDA — semelhante ao EV/EBIT, mas antes de descontar depreciação e amortização.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "lower-is-better",
    getValue: (d) => d.stock?.evToEbitda ?? null,
  },
  {
    key: "bookValuePerShare",
    label: "Valor Patrimonial",
    unit: "currency",
    category: "Valuation",
    description: "Patrimônio líquido dividido pelo número de ações — quanto cada ação representa do patrimônio contábil da empresa.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => (d.stock?.bookValuePerShareCents != null ? d.stock.bookValuePerShareCents / 100 : null),
  },
  {
    key: "roe",
    label: "ROE",
    unit: "percent",
    category: "Rentabilidade",
    description: "Retorno sobre o patrimônio líquido — quanto lucro a empresa gera para cada real de patrimônio dos acionistas.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => d.stock?.roe ?? null,
  },
  {
    key: "roic",
    label: "ROIC",
    unit: "percent",
    category: "Rentabilidade",
    description: "Retorno sobre o capital investido (próprio + dívida) — mede a eficiência da empresa em gerar lucro operacional com o capital total empregado.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => d.stock?.roic ?? null,
  },
  {
    key: "roa",
    label: "ROA",
    unit: "percent",
    category: "Rentabilidade",
    description: "Retorno sobre os ativos — quanto lucro a empresa gera para cada real em ativos totais, independentemente de como são financiados.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => d.stock?.roa ?? null,
  },
  {
    key: "grossMargin",
    label: "Margem Bruta",
    unit: "percent",
    category: "Margens",
    description: "Lucro bruto dividido pela receita — quanto sobra das vendas depois do custo direto de produzir o produto ou serviço.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => d.stock?.grossMargin ?? null,
  },
  {
    key: "ebitdaMargin",
    label: "Margem EBITDA",
    unit: "percent",
    category: "Margens",
    description: "EBITDA dividido pela receita — rentabilidade operacional antes de juros, impostos, depreciação e amortização.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => d.stock?.ebitdaMargin ?? null,
  },
  {
    key: "netMargin",
    label: "Margem Líquida",
    unit: "percent",
    category: "Margens",
    description: "Lucro líquido dividido pela receita — quanto de cada real vendido vira lucro final para os acionistas.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => d.stock?.netMargin ?? null,
  },
  {
    key: "dividendYield",
    label: "Dividend Yield",
    unit: "percent",
    category: "Dividendos",
    description: "Dividendos pagos nos últimos 12 meses dividido pelo preço atual da ação — o retorno em proventos sobre o preço de hoje.",
    assetClasses: ["STOCK", "BDR", "FII", "ETF"],
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => d.stock?.dividendYield ?? d.fii?.dividendYield ?? d.etf?.dividendYield ?? null,
  },
  {
    key: "payout",
    label: "Payout",
    unit: "percent",
    category: "Dividendos",
    description: "Percentual do lucro líquido que a empresa distribuiu como dividendos nos últimos 12 meses.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "neutral",
    getValue: (d) => d.stock?.payout ?? null,
  },
  {
    key: "beta",
    label: "Beta",
    unit: "ratio",
    category: "Estrutura",
    description: "Quanto a ação costuma variar em relação ao mercado — acima de 1 indica mais volatilidade que o índice, abaixo de 1 indica menos.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "neutral",
    getValue: (d) => d.stock?.beta ?? null,
  },
  {
    key: "cash",
    label: "Caixa",
    unit: "currency",
    category: "Endividamento",
    description: "Caixa e equivalentes de caixa — o dinheiro disponível da empresa, usado para calcular a dívida líquida.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    // Idem EV: identidade exata (Caixa = Dívida Bruta − Dívida Líquida), não
    // uma estimativa — os dois campos de origem já são persistidos.
    getValue: (d) =>
      d.stock?.grossDebtCents != null && d.stock?.netDebtCents != null
        ? Number(d.stock.grossDebtCents) / 100 - Number(d.stock.netDebtCents) / 100
        : null,
  },
  {
    key: "grossDebt",
    label: "Dívida Bruta",
    unit: "currency",
    category: "Endividamento",
    description: "Soma de todas as dívidas financeiras da empresa, antes de descontar o caixa disponível.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "lower-is-better",
    getValue: (d) => (d.stock?.grossDebtCents != null ? Number(d.stock.grossDebtCents) / 100 : null),
  },
  {
    key: "netDebt",
    label: "Dívida Líquida",
    unit: "currency",
    category: "Endividamento",
    description: "Dívida bruta menos o caixa disponível — quanto a empresa efetivamente deve depois de usar seu próprio caixa para abater a dívida.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "lower-is-better",
    getValue: (d) => (d.stock?.netDebtCents != null ? Number(d.stock.netDebtCents) / 100 : null),
  },
  {
    key: "netDebtToEbitda",
    label: "Dívida Líquida/EBITDA",
    unit: "ratio",
    category: "Endividamento",
    description: "Quantos anos de geração de caixa operacional (EBITDA) seriam necessários para quitar a dívida líquida.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "lower-is-better",
    getValue: (d) => d.stock?.netDebtToEbitda ?? null,
  },
  {
    key: "currentLiquidity",
    label: "Liquidez Corrente",
    unit: "ratio",
    category: "Endividamento",
    description: "Ativo circulante dividido pelo passivo circulante — a capacidade da empresa de pagar suas obrigações de curto prazo.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => d.stock?.currentLiquidity ?? null,
  },
  {
    key: "revenueCagr3y",
    label: "CAGR Receita (3a)",
    unit: "percent",
    category: "Crescimento",
    description: "Taxa de crescimento anual composta da receita nos últimos 3 anos de exercício.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => d.stock?.revenueCagr3y ?? null,
  },
  {
    key: "netIncomeCagr3y",
    label: "CAGR Lucro (3a)",
    unit: "percent",
    category: "Crescimento",
    description: "Taxa de crescimento anual composta do lucro líquido nos últimos 3 anos de exercício.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => d.stock?.netIncomeCagr3y ?? null,
  },
  {
    key: "revenue",
    label: "Receita",
    unit: "currency",
    category: "Resultados",
    description: "Receita líquida total do último exercício anual reportado.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => (d.stock?.revenueCents != null ? Number(d.stock.revenueCents) / 100 : null),
  },
  {
    key: "netIncome",
    label: "Lucro Líquido",
    unit: "currency",
    category: "Resultados",
    description: "Lucro líquido total do último exercício anual reportado, já descontados todos os custos, despesas e impostos.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => (d.stock?.netIncomeCents != null ? Number(d.stock.netIncomeCents) / 100 : null),
  },
  {
    key: "ebitda",
    label: "EBITDA",
    unit: "currency",
    category: "Resultados",
    description: "Lucro antes de juros, impostos, depreciação e amortização — uma medida da geração de caixa operacional do negócio.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => (d.stock?.ebitdaCents != null ? Number(d.stock.ebitdaCents) / 100 : null),
  },
  {
    key: "operatingCashFlow",
    label: "Fluxo Operacional",
    unit: "currency",
    category: "Resultados",
    description: "Caixa gerado pelas operações do negócio no último exercício, antes de investimentos e financiamentos.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => (d.stock?.operatingCashFlowCents != null ? Number(d.stock.operatingCashFlowCents) / 100 : null),
  },
  {
    key: "freeCashFlow",
    label: "Fluxo de Caixa Livre",
    unit: "currency",
    category: "Resultados",
    description: "Caixa operacional menos investimentos em ativos fixos — o dinheiro que sobra livre para pagar dívidas, dividendos ou recompras.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => (d.stock?.freeCashFlowCents != null ? Number(d.stock.freeCashFlowCents) / 100 : null),
  },
  {
    key: "equity",
    label: "Patrimônio Líquido",
    unit: "currency",
    category: "Resultados",
    description: "Diferença entre ativos e passivos totais da empresa — o valor contábil pertencente aos acionistas.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => (d.stock?.equityCents != null ? Number(d.stock.equityCents) / 100 : null),
  },
  {
    key: "sharesOutstanding",
    label: "Quantidade de Ações",
    unit: "count",
    category: "Estrutura",
    description: "Número total de ações em circulação emitidas pela empresa.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "neutral",
    getValue: (d) => (d.stock?.sharesOutstanding != null ? Number(d.stock.sharesOutstanding) : null),
  },
  {
    key: "freeFloatPct",
    label: "Free Float",
    unit: "percent",
    category: "Estrutura",
    description: "Percentual das ações em circulação livre no mercado, fora do controle de acionistas controladores.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "higher-is-better",
    getValue: (d) => d.stock?.freeFloatPct ?? null,
  },
  {
    key: "employees",
    label: "Funcionários",
    unit: "count",
    category: "Estrutura",
    description: "Número total de funcionários reportado pela empresa.",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    direction: "neutral",
    getValue: (d) => (d.employees != null ? d.employees : null),
  },
  // Deliberately NOT modeled as a Prisma column — confirmed absent from
  // every BRAPI module this app requests (defaultKeyStatistics,
  // financialData, summaryProfile, and all 8 statement-history modules),
  // not merely gated by plan tier. getValue always returns null; the card
  // copy explains there is no data source, not that a sync is pending.
  {
    key: "tagAlong",
    label: "Tag Along",
    unit: "percent",
    category: "Estrutura",
    description: "Percentual do preço pago ao controlador que os minoritários recebem em caso de venda do controle da empresa.",
    assetClasses: STOCK_AND_BDR,
    availability: "never-available",
    direction: "neutral",
    getValue: () => null,
  },
]

export function getIndicatorsForAssetClass(assetClass: AssetClass): IndicatorDefinition[] {
  return INDICATOR_DEFINITIONS.filter((indicator) => indicator.assetClasses.includes(assetClass))
}

/// Groups an already-filtered indicator list by category, in the fixed
/// display order above — the single place that turns the flat registry into
/// the Fundamentos grid's labeled subsections. Categories with no matching
/// indicator for this asset class are omitted entirely.
export function groupIndicatorsByCategory(
  indicators: IndicatorDefinition[]
): { category: IndicatorCategory; indicators: IndicatorDefinition[] }[] {
  return INDICATOR_CATEGORY_ORDER.map((category) => ({
    category,
    indicators: indicators.filter((indicator) => indicator.category === category),
  })).filter((group) => group.indicators.length > 0)
}

/// Formats a raw indicator value per its declared unit — the ONLY place
/// this formatting happens, so every card renders numbers consistently.
export function formatIndicatorValue(value: number, unit: IndicatorUnit): string {
  switch (unit) {
    case "percent":
      return `${value.toFixed(2).replace(".", ",")}%`
    case "currency":
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        notation: value >= 1_000_000 ? "compact" : "standard",
        maximumFractionDigits: 2,
      }).format(value)
    case "count":
      return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 2 }).format(value)
    case "years":
      return `${value.toFixed(1)} anos`
    case "ratio":
    default:
      // Matches the convention on Investidor10/Status Invest — P/L, P/VP,
      // PSR etc. are shown as plain decimals (no "x" suffix); only Beta and
      // leverage ratios read naturally with one, so this stays a bare number
      // for every "ratio" indicator rather than special-casing a few keys.
      return value.toFixed(2).replace(".", ",")
  }
}
