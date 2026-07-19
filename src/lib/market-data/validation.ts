/// Sanity checks a fetched quote before it's allowed to overwrite what's
/// already in Postgres. Provider bugs and transient bad responses (a
/// momentarily-zeroed price, a decimal-place glitch on market cap) are
/// common enough in free/best-effort market-data feeds that "the provider
/// answered" isn't sufficient — the answer also has to be plausible.
export interface QuoteValidationInput {
  previousPriceCents: number | null
  newPriceCents: number | null
  priceChangePct: number | null
  marketCapCents: bigint | null
  priceToEarnings: number | null
  dividendYieldPct: number | null
}

export interface QuoteValidationResult {
  valid: boolean
  reasons: string[]
}

const MAX_ABS_DAY_CHANGE_PCT = 40
const MAX_ABS_PRICE_TO_EARNINGS = 1000

export function validateQuote(input: QuoteValidationInput): QuoteValidationResult {
  const reasons: string[] = []

  if (input.newPriceCents != null && input.newPriceCents <= 0) {
    reasons.push("Preço zerado ou negativo")
  }

  const impliedChangePct =
    input.previousPriceCents != null &&
    input.previousPriceCents > 0 &&
    input.newPriceCents != null
      ? ((input.newPriceCents - input.previousPriceCents) / input.previousPriceCents) * 100
      : null
  const changePct = input.priceChangePct ?? impliedChangePct
  if (changePct != null && Math.abs(changePct) > MAX_ABS_DAY_CHANGE_PCT) {
    reasons.push(`Variação de preço implausível (${changePct.toFixed(1)}%)`)
  }

  if (input.marketCapCents != null && input.marketCapCents < BigInt(0)) {
    reasons.push("Market cap negativo")
  }

  // Negative P/L is real (a loss-making company) and not rejected on its
  // own — only a magnitude that signals a data glitch (e.g. earnings near
  // zero blowing up the ratio) is.
  if (input.priceToEarnings != null && Math.abs(input.priceToEarnings) > MAX_ABS_PRICE_TO_EARNINGS) {
    reasons.push("P/L implausível")
  }

  if (input.dividendYieldPct != null && input.dividendYieldPct < 0) {
    reasons.push("Dividend Yield negativo")
  }

  return { valid: reasons.length === 0, reasons }
}
