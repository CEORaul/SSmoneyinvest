"use server"

import type { AiQuestionType } from "@/generated/prisma/client"
import {
  computeTrailingDividendYield,
  getCompanyByTicker,
  getDividendHistory,
  getSectorIndicatorAverage,
} from "@/features/company/queries"
import { aiContentService } from "@/services/ai-content-service"
import { prisma } from "@/lib/prisma"

/// Fields getSectorIndicatorAverage() knows how to average directly off the
/// Stock table — indicators outside this set (derived/currency figures)
/// simply never get a sector-comparison prompt, and the AI is told the
/// comparison is unavailable rather than a value being estimated for it.
const SECTOR_COMPARABLE_FIELDS = new Set([
  "priceToEarnings",
  "priceToBook",
  "roe",
  "roic",
  "roa",
  "dividendYield",
  "netMargin",
])

export interface IndicatorExplanationResult {
  ok: boolean
  text?: string
}

/// Backs the "ⓘ IA" popover's 5 fixed quick-question buttons — zero free
/// text, the question is always one of the AiQuestionType values. Looks the
/// company up by id (not by trusting a client-supplied ticker string) to
/// keep this consistent with every other action in the app that re-derives
/// the entity server-side instead of trusting client state.
export async function requestIndicatorExplanationAction(
  companyId: string,
  indicatorKey: string,
  questionType: AiQuestionType
): Promise<IndicatorExplanationResult> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { ticker: true } })
  if (!company) return { ok: false }

  const dto = await getCompanyByTicker(company.ticker)
  if (!dto) return { ok: false }

  // Same override as the page itself — Stock/Fii/Etf.dividendYield is never
  // populated by any sync, so the "dividendYield" indicator's real value
  // only exists via this trailing-12-month computation.
  if (indicatorKey === "dividendYield") {
    const dividendHistory = await getDividendHistory(dto.id)
    const trailingYield = computeTrailingDividendYield(dividendHistory, dto.priceCents)
    if (trailingYield != null) {
      if (dto.stock) dto.stock.dividendYield = trailingYield
      if (dto.fii) dto.fii.dividendYield = trailingYield
      if (dto.etf) dto.etf.dividendYield = trailingYield
    }
  }

  let sectorAverage: Awaited<ReturnType<typeof getSectorIndicatorAverage>> = null
  try {
    sectorAverage =
      dto.sector && SECTOR_COMPARABLE_FIELDS.has(indicatorKey)
        ? await getSectorIndicatorAverage(
            dto.sector,
            dto.assetClass,
            indicatorKey as Parameters<typeof getSectorIndicatorAverage>[2],
            dto.id
          )
        : null
  } catch (error) {
    console.error("[requestIndicatorExplanationAction] sector average failed", indicatorKey, error)
  }

  const result = await aiContentService.getOrGenerateIndicatorExplanation(
    dto,
    indicatorKey,
    questionType,
    sectorAverage
  )

  return result ? { ok: true, text: result.text } : { ok: false }
}
