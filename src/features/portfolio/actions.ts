"use server"

import { revalidatePath } from "next/cache"

import type { AssetClass } from "@/generated/prisma/client"
import {
  adjustmentSchema,
  incomeSchema,
  manualCompanySchema,
  tradeSchema,
  type AdjustmentInput,
  type IncomeInput,
  type ManualCompanyInput,
  type TradeInput,
} from "@/features/portfolio/schemas"
import {
  findOrCreateManualCompany,
  getPositionTransactions,
  searchCompanies,
  type CompanySearchResult,
} from "@/features/portfolio/queries"
import { requireUser } from "@/lib/auth/session"
import {
  deleteTransaction,
  previewHistoricalPrice,
  recordAdjustment,
  recordIncome,
  recordTrade,
  removePosition,
} from "@/services/portfolio-service"

export interface ActionResult {
  ok: boolean
  error?: string
}

function toErrorResult(error: unknown): ActionResult {
  const message =
    error instanceof Error ? error.message : "Não foi possível concluir a operação."
  return { ok: false, error: message }
}

export async function searchCompaniesAction(
  query: string,
  assetClass?: AssetClass
): Promise<CompanySearchResult[]> {
  return searchCompanies(query, assetClass)
}

export interface CreateManualCompanyResult extends ActionResult {
  company?: CompanySearchResult
}

/// For Cripto/Renda Fixa/Outros — categories with no market-data provider
/// to autocomplete against yet. Creates (or reuses) a bare Company row so
/// the trade dialog has something to attach the transaction to.
export async function createManualCompanyAction(
  input: ManualCompanyInput
): Promise<CreateManualCompanyResult> {
  const parsed = manualCompanySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  await requireUser()
  try {
    const company = await findOrCreateManualCompany(parsed.data)
    return { ok: true, company }
  } catch (error) {
    return toErrorResult(error)
  }
}

export interface TransactionRow {
  id: string
  type: string
  date: string
  quantity: string
  priceCents: number
  totalCents: string
  feesCents: number
  priceSource: string | null
  isManualPrice: boolean
  realizedProfitCents: string | null
  note: string | null
}

// Prisma's Decimal/BigInt aren't plain-serializable across the Server
// Action boundary — convert to string/number here, not in the client
// component, so the wire format is always predictable primitives.
export async function getPositionTransactionsAction(companyId: string): Promise<TransactionRow[]> {
  const profile = await requireUser()
  const transactions = await getPositionTransactions(profile.id, companyId)

  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
    date: t.date.toISOString(),
    quantity: t.quantity.toString(),
    priceCents: t.priceCents,
    totalCents: t.totalCents.toString(),
    feesCents: t.feesCents,
    priceSource: t.priceSource,
    isManualPrice: t.isManualPrice,
    realizedProfitCents: t.realizedProfitCents != null ? t.realizedProfitCents.toString() : null,
    note: t.note,
  }))
}

export interface PricePreviewResult {
  ok: boolean
  priceCents?: number
  actualDate?: string
  source?: string
  error?: string
}

/// Powers the live "R$ 26,84 x 100 = R$ 2.684,00" preview in the trade
/// dialog — read-only from the portfolio's point of view (may warm the
/// price-history cache, never touches Transaction/PortfolioPosition).
export async function previewTradePriceAction(
  companyId: string,
  date: string
): Promise<PricePreviewResult> {
  await requireUser()
  try {
    const result = await previewHistoricalPrice(companyId, new Date(date))
    return {
      ok: true,
      priceCents: result.priceCents,
      actualDate: result.actualDate.toISOString(),
      source: result.source,
    }
  } catch (error) {
    return { ok: false, error: toErrorResult(error).error }
  }
}

export async function recordTradeAction(input: TradeInput): Promise<ActionResult> {
  const parsed = tradeSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const profile = await requireUser()
  try {
    await recordTrade({ profileId: profile.id, ...parsed.data })
  } catch (error) {
    return toErrorResult(error)
  }

  revalidatePath("/carteira")
  // Also covers /empresa/[ticker]'s "Minha Posição" card — a trade recorded
  // there must reflect immediately on the same page, not just on /carteira.
  revalidatePath("/empresa/[ticker]", "page")
  return { ok: true }
}

export async function recordIncomeAction(input: IncomeInput): Promise<ActionResult> {
  const parsed = incomeSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const profile = await requireUser()
  try {
    await recordIncome({ profileId: profile.id, ...parsed.data })
  } catch (error) {
    return toErrorResult(error)
  }

  revalidatePath("/carteira")
  // Also covers /empresa/[ticker]'s "Minha Posição" card — a trade recorded
  // there must reflect immediately on the same page, not just on /carteira.
  revalidatePath("/empresa/[ticker]", "page")
  return { ok: true }
}

export async function recordAdjustmentAction(input: AdjustmentInput): Promise<ActionResult> {
  const parsed = adjustmentSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const profile = await requireUser()
  try {
    await recordAdjustment({ profileId: profile.id, ...parsed.data })
  } catch (error) {
    return toErrorResult(error)
  }

  revalidatePath("/carteira")
  // Also covers /empresa/[ticker]'s "Minha Posição" card — a trade recorded
  // there must reflect immediately on the same page, not just on /carteira.
  revalidatePath("/empresa/[ticker]", "page")
  return { ok: true }
}

export async function deleteTransactionAction(transactionId: string): Promise<ActionResult> {
  const profile = await requireUser()
  try {
    await deleteTransaction(profile.id, transactionId)
  } catch (error) {
    return toErrorResult(error)
  }

  revalidatePath("/carteira")
  // Also covers /empresa/[ticker]'s "Minha Posição" card — a trade recorded
  // there must reflect immediately on the same page, not just on /carteira.
  revalidatePath("/empresa/[ticker]", "page")
  return { ok: true }
}

export async function removePositionAction(companyId: string): Promise<ActionResult> {
  const profile = await requireUser()
  try {
    await removePosition(profile.id, companyId)
  } catch (error) {
    return toErrorResult(error)
  }

  revalidatePath("/carteira")
  // Also covers /empresa/[ticker]'s "Minha Posição" card — a trade recorded
  // there must reflect immediately on the same page, not just on /carteira.
  revalidatePath("/empresa/[ticker]", "page")
  return { ok: true }
}
