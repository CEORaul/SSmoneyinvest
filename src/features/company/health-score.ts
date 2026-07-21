import type { CompanyDetailDTO } from "@/features/company/queries"

export type HealthBucket = "Excelente" | "Boa" | "Regular" | "Fraca" | "Muito Fraca"

export interface HealthScoreResult {
  score: number
  bucket: HealthBucket
  /// How many of the 5 dimensions actually had real data — surfaced so the
  /// UI can caveat a score built from a thin sample honestly.
  dimensionsUsed: number
}

interface Dimension {
  name: string
  value: number | null
  /// Maps the raw value to a 0-100 sub-score. Never returns a value for a
  /// dimension whose input is null — the caller skips it entirely rather
  /// than defaulting to a neutral/fake midpoint.
  toScore(value: number): number
}

const MIN_DIMENSIONS_FOR_SCORE = 3

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

function buildDimensions(dto: CompanyDetailDTO): Dimension[] {
  const stock = dto.stock
  return [
    {
      name: "rentabilidade",
      value: stock?.roe ?? null,
      // ROE 0% → 0, 25%+ → 100, linear between.
      toScore: (roe) => clamp((roe / 25) * 100),
    },
    {
      name: "crescimento",
      value:
        stock?.revenueCagr3y != null && stock?.netIncomeCagr3y != null
          ? (stock.revenueCagr3y + stock.netIncomeCagr3y) / 2
          : (stock?.revenueCagr3y ?? stock?.netIncomeCagr3y ?? null),
      // -10% CAGR → 0, 20%+ CAGR → 100.
      toScore: (cagr) => clamp(((cagr + 10) / 30) * 100),
    },
    {
      name: "endividamento",
      value: stock?.netDebtToEbitda ?? null,
      // 0x or negative (net cash) → 100, 5x+ → 0. Lower leverage is better.
      toScore: (ratio) => clamp(100 - (ratio / 5) * 100),
    },
    {
      name: "dividendos",
      value: stock?.dividendYield ?? null,
      // 0% → 0, 8%+ DY → 100.
      toScore: (dy) => clamp((dy / 8) * 100),
    },
    {
      name: "liquidez",
      value: stock?.currentLiquidity ?? null,
      // 0.5x → 0, 2x+ → 100.
      toScore: (liquidity) => clamp(((liquidity - 0.5) / 1.5) * 100),
    },
  ]
}

function bucketFor(score: number): HealthBucket {
  if (score >= 80) return "Excelente"
  if (score >= 65) return "Boa"
  if (score >= 45) return "Regular"
  if (score >= 25) return "Fraca"
  return "Muito Fraca"
}

/// Returns null when fewer than MIN_DIMENSIONS_FOR_SCORE dimensions have
/// real data — the UI must show a "dados insuficientes" notice instead of a
/// score built on a thin, potentially misleading sample. Only ever STOCK/BDR
/// (see asset-category.ts's hasFundamentals) — FIIs/ETFs/manual-entry
/// categories never call this.
export function computeHealthScore(dto: CompanyDetailDTO): HealthScoreResult | null {
  const dimensions = buildDimensions(dto).filter((d): d is Dimension & { value: number } => d.value != null)
  if (dimensions.length < MIN_DIMENSIONS_FOR_SCORE) return null

  const scores = dimensions.map((d) => d.toScore(d.value))
  const score = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)

  return { score, bucket: bucketFor(score), dimensionsUsed: dimensions.length }
}
