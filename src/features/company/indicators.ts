import type { AssetClass } from "@/generated/prisma/client"
import type { CompanyDetailDTO } from "@/features/company/queries"

export type IndicatorUnit = "ratio" | "percent" | "currency" | "count" | "years"

export interface IndicatorDefinition {
  key: string
  label: string
  unit: IndicatorUnit
  assetClasses: AssetClass[]
  /// "sourced": a real provider could populate this (null today just means
  /// no sync has produced it yet — counts against data coverage). "never-
  /// available": no data source exists for this at all, at any plan tier
  /// (Tag Along, Fluxo de Caixa) — excluded from coverage entirely so it
  /// never puts a permanent ceiling on the percentage.
  availability: "sourced" | "never-available"
  getValue(dto: CompanyDetailDTO): number | null
}

const STOCK_AND_BDR: AssetClass[] = ["STOCK", "BDR"]

/// One array drives everything: which cards render for a given asset, the
/// coverage %, and — critically — the ONLY way a card's value is ever
/// produced (straight off the DTO's nullable Prisma columns via getValue).
/// No component ever computes an indicator from raw numbers itself, so
/// there is no path to inventing a value that isn't already in the database.
export const INDICATOR_DEFINITIONS: IndicatorDefinition[] = [
  { key: "priceToEarnings", label: "P/L", unit: "ratio", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.priceToEarnings ?? null },
  { key: "priceToBook", label: "P/VP", unit: "ratio", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.priceToBook ?? null },
  { key: "psr", label: "PSR", unit: "ratio", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.psr ?? null },
  { key: "evToEbit", label: "EV/EBIT", unit: "ratio", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.evToEbit ?? null },
  { key: "evToEbitda", label: "EV/EBITDA", unit: "ratio", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.evToEbitda ?? null },
  { key: "roe", label: "ROE", unit: "percent", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.roe ?? null },
  { key: "roic", label: "ROIC", unit: "percent", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.roic ?? null },
  { key: "roa", label: "ROA", unit: "percent", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.roa ?? null },
  { key: "grossMargin", label: "Margem Bruta", unit: "percent", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.grossMargin ?? null },
  { key: "ebitdaMargin", label: "Margem EBITDA", unit: "percent", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.ebitdaMargin ?? null },
  { key: "netMargin", label: "Margem Líquida", unit: "percent", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.netMargin ?? null },
  { key: "dividendYield", label: "Dividend Yield", unit: "percent", assetClasses: ["STOCK", "BDR", "FII", "ETF"], availability: "sourced", getValue: (d) => d.stock?.dividendYield ?? d.fii?.dividendYield ?? d.etf?.dividendYield ?? null },
  { key: "payout", label: "Payout", unit: "percent", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.payout ?? null },
  { key: "currentLiquidity", label: "Liquidez Corrente", unit: "ratio", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.currentLiquidity ?? null },
  { key: "netDebtToEbitda", label: "Dívida Líquida/EBITDA", unit: "ratio", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.netDebtToEbitda ?? null },
  { key: "revenueCagr3y", label: "CAGR Receita (3a)", unit: "percent", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.revenueCagr3y ?? null },
  { key: "netIncomeCagr3y", label: "CAGR Lucro (3a)", unit: "percent", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.netIncomeCagr3y ?? null },
  { key: "freeFloatPct", label: "Free Float", unit: "percent", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.freeFloatPct ?? null },
  { key: "beta", label: "Beta", unit: "ratio", assetClasses: STOCK_AND_BDR, availability: "sourced", getValue: (d) => d.stock?.beta ?? null },
  {
    key: "bookValuePerShare",
    label: "Valor Patrimonial",
    unit: "currency",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    getValue: (d) => (d.stock?.bookValuePerShareCents != null ? d.stock.bookValuePerShareCents / 100 : null),
  },
  {
    key: "sharesOutstanding",
    label: "Quantidade de Ações",
    unit: "count",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    getValue: (d) => (d.stock?.sharesOutstanding != null ? Number(d.stock.sharesOutstanding) : null),
  },
  {
    key: "equity",
    label: "Patrimônio Líquido",
    unit: "currency",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    getValue: (d) => (d.stock?.equityCents != null ? Number(d.stock.equityCents) / 100 : null),
  },
  {
    key: "revenue",
    label: "Receita",
    unit: "currency",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    getValue: (d) => (d.stock?.revenueCents != null ? Number(d.stock.revenueCents) / 100 : null),
  },
  {
    key: "netIncome",
    label: "Lucro",
    unit: "currency",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    getValue: (d) => (d.stock?.netIncomeCents != null ? Number(d.stock.netIncomeCents) / 100 : null),
  },
  {
    key: "grossDebt",
    label: "Dívida Bruta",
    unit: "currency",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    getValue: (d) => (d.stock?.grossDebtCents != null ? Number(d.stock.grossDebtCents) / 100 : null),
  },
  {
    key: "netDebt",
    label: "Dívida Líquida",
    unit: "currency",
    assetClasses: STOCK_AND_BDR,
    availability: "sourced",
    getValue: (d) => (d.stock?.netDebtCents != null ? Number(d.stock.netDebtCents) / 100 : null),
  },
  // Deliberately NOT modeled as Prisma columns — no real source exists for
  // either at any BRAPI/Yahoo plan tier. getValue always returns null; the
  // card copy explains there is no data source, not that a sync is pending.
  { key: "tagAlong", label: "Tag Along", unit: "percent", assetClasses: STOCK_AND_BDR, availability: "never-available", getValue: () => null },
  { key: "freeCashFlow", label: "Fluxo de Caixa Livre", unit: "currency", assetClasses: STOCK_AND_BDR, availability: "never-available", getValue: () => null },
]

export function getIndicatorsForAssetClass(assetClass: AssetClass): IndicatorDefinition[] {
  return INDICATOR_DEFINITIONS.filter((indicator) => indicator.assetClasses.includes(assetClass))
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
