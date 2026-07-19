import "server-only"

import type { TransactionType } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { marketDataService } from "@/services/market-data-service"

export const PRICE_SOURCE_CACHE = "cache"
export const PRICE_SOURCE_MANUAL = "manual"

// B3 never goes more than a handful of days without a trading session
// (long weekends, back-to-back holidays) — 10 days is a generous margin
// for "the nearest prior price we have is genuinely the last trading day
// before this date" vs. "we just never synced data anywhere near here."
const COVERAGE_WINDOW_DAYS = 10

/// Thrown when replaying a position's transaction history would produce a
/// negative quantity at some point in time — e.g. deleting a BUY that a
/// later SELL depended on. Callers should surface this as a business
/// error, not a generic failure.
export class PortfolioReplayError extends Error {}

interface HistoricalPriceResult {
  priceCents: number
  actualDate: Date
  source: string
}

/// The core "no manual prices" engine. Checks the cached price history
/// first; if there's no point within COVERAGE_WINDOW_DAYS at or before
/// `targetDate`, fetches live (via the same brapi→Yahoo failover chain the
/// sync jobs use) and persists it before retrying once.
async function getHistoricalClosePrice(
  companyId: string,
  ticker: string,
  targetDate: Date
): Promise<HistoricalPriceResult> {
  const cached = await findNearestPriorPrice(companyId, targetDate)
  if (cached && withinCoverageWindow(cached.date, targetDate)) {
    return { priceCents: cached.closeCents, actualDate: cached.date, source: PRICE_SOURCE_CACHE }
  }

  const refresh = await marketDataService.refreshCompanyDetails(ticker, "max")
  if (!refresh.ok) {
    throw new Error(
      `Não foi possível obter o histórico de preços de ${ticker}: ${refresh.reason}`
    )
  }

  const retry = await findNearestPriorPrice(companyId, targetDate)
  if (!retry) {
    const isoDate = targetDate.toISOString().slice(0, 10)
    throw new Error(`Não há cotação disponível para ${ticker} em ${isoDate} ou antes.`)
  }

  return { priceCents: retry.closeCents, actualDate: retry.date, source: refresh.source }
}

function withinCoverageWindow(foundDate: Date, targetDate: Date): boolean {
  const diffMs = targetDate.getTime() - foundDate.getTime()
  return diffMs >= 0 && diffMs <= COVERAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

function findNearestPriorPrice(companyId: string, targetDate: Date) {
  return prisma.priceHistoryPoint.findFirst({
    where: { companyId, date: { lte: targetDate } },
    orderBy: { date: "desc" },
  })
}

/// Recomputes a position from scratch by replaying every transaction for
/// it in chronological order — never incrementally patched. This is what
/// makes editing/deleting a transaction always correct: average price and
/// realized profit are re-derived from the full history every time, not
/// undone-and-redone. Runs inside the caller's $transaction so the
/// triggering write and the resulting position update are atomic.
export async function recomputePosition(
  tx: Prisma.TransactionClient,
  profileId: string,
  companyId: string
): Promise<void> {
  const transactions = await tx.transaction.findMany({
    where: { profileId, companyId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  })

  let quantity = new Prisma.Decimal(0)
  let totalInvestedCents = new Prisma.Decimal(0)
  let totalDividendsCents = BigInt(0)
  let wentNegative = false

  for (const t of transactions) {
    switch (t.type) {
      case "BUY":
      case "BONUS":
      case "SPLIT": {
        quantity = quantity.add(t.quantity)
        totalInvestedCents = totalInvestedCents.add(t.totalCents.toString())
        break
      }
      case "REVERSE_SPLIT": {
        quantity = quantity.sub(t.quantity)
        break
      }
      case "SELL": {
        const avgPriceCents = quantity.gt(0)
          ? totalInvestedCents.div(quantity)
          : new Prisma.Decimal(0)
        const costBasisCents = avgPriceCents.mul(t.quantity)
        quantity = quantity.sub(t.quantity)
        totalInvestedCents = totalInvestedCents.sub(costBasisCents)

        const realizedProfitCents =
          BigInt(t.totalCents) - BigInt(costBasisCents.round().toFixed(0))
        if (t.realizedProfitCents !== realizedProfitCents) {
          await tx.transaction.update({
            where: { id: t.id },
            data: { realizedProfitCents },
          })
        }
        break
      }
      case "DIVIDEND":
      case "JCP": {
        totalDividendsCents += BigInt(t.totalCents)
        break
      }
    }

    if (quantity.lt(0)) {
      wentNegative = true
    }
    if (quantity.lte(0)) {
      quantity = new Prisma.Decimal(0)
      totalInvestedCents = new Prisma.Decimal(0)
    }
  }

  if (wentNegative) {
    throw new PortfolioReplayError(
      "Esta alteração deixaria a posição com quantidade negativa em algum ponto do histórico — existem vendas que dependem de uma compra anterior a esta operação."
    )
  }

  const finalTotalInvestedCents = BigInt(totalInvestedCents.round().toFixed(0))
  const finalAveragePriceCents = quantity.gt(0)
    ? totalInvestedCents.div(quantity).round().toNumber()
    : 0

  await tx.portfolioPosition.upsert({
    where: { profileId_companyId: { profileId, companyId } },
    update: {
      quantity,
      averagePriceCents: finalAveragePriceCents,
      totalInvestedCents: finalTotalInvestedCents,
      totalDividendsCents,
    },
    create: {
      profileId,
      companyId,
      quantity,
      averagePriceCents: finalAveragePriceCents,
      totalInvestedCents: finalTotalInvestedCents,
      totalDividendsCents,
    },
  })
}

export interface RecordTradeInput {
  profileId: string
  companyId: string
  type: Extract<TransactionType, "BUY" | "SELL">
  date: Date
  quantity: string | number
  feesCents?: number
  note?: string
  /** "Editar preço da operação" — advanced, off by default. */
  overridePriceCents?: number
}

export interface RecordIncomeInput {
  profileId: string
  companyId: string
  type: Extract<TransactionType, "DIVIDEND" | "JCP">
  date: Date
  quantity: string | number
  amountPerShareCents: number
  note?: string
}

export interface RecordAdjustmentInput {
  profileId: string
  companyId: string
  type: Extract<TransactionType, "BONUS" | "SPLIT" | "REVERSE_SPLIT">
  date: Date
  quantity: string | number
  note?: string
}

async function requireCompany(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw new Error("Ativo não encontrado.")
  return company
}

/// Read-only preview of what recordTrade() would resolve the price to —
/// lets the "Adicionar Ativo" dialog show "R$ 26,84 x 100 = R$ 2.684,00"
/// before the user commits. May still trigger a live provider fetch (and
/// cache write) if the date isn't covered yet — that's an idempotent
/// warm-the-cache side effect, not a portfolio mutation.
export async function previewHistoricalPrice(
  companyId: string,
  date: Date
): Promise<HistoricalPriceResult> {
  const company = await requireCompany(companyId)
  return getHistoricalClosePrice(company.id, company.ticker, date)
}

/// Buy/sell — the flow with automatic historical-price lookup. The caller
/// only ever supplies asset + date + quantity (+ optional fees/note); every
/// price and total is resolved here, never trusted from the client.
export async function recordTrade(input: RecordTradeInput) {
  const company = await requireCompany(input.companyId)

  const quantity = new Prisma.Decimal(input.quantity)
  if (quantity.lte(0)) throw new Error("A quantidade deve ser maior que zero.")

  let priceCents: number
  let priceSource: string
  let isManualPrice = false
  let resolvedDate = input.date
  let note = input.note ?? null

  if (input.overridePriceCents != null) {
    priceCents = input.overridePriceCents
    priceSource = PRICE_SOURCE_MANUAL
    isManualPrice = true
  } else {
    const resolved = await getHistoricalClosePrice(company.id, company.ticker, input.date)
    priceCents = resolved.priceCents
    priceSource = resolved.source
    if (resolved.actualDate.getTime() !== input.date.getTime()) {
      resolvedDate = resolved.actualDate
      const adjustedNote = `Sem pregão em ${input.date.toLocaleDateString("pt-BR")} — usado o fechamento de ${resolved.actualDate.toLocaleDateString("pt-BR")}.`
      note = note ? `${note} (${adjustedNote})` : adjustedNote
    }
  }

  const grossCents = BigInt(quantity.mul(priceCents).round().toFixed(0))
  const feesCents = BigInt(input.feesCents ?? 0)
  const totalCents = input.type === "BUY" ? grossCents + feesCents : grossCents - feesCents

  if (input.type === "SELL") {
    const position = await prisma.portfolioPosition.findUnique({
      where: { profileId_companyId: { profileId: input.profileId, companyId: company.id } },
    })
    const owned = position?.quantity ?? new Prisma.Decimal(0)
    if (quantity.gt(owned)) {
      throw new Error(
        `Você possui ${owned.toString()} unidade(s) de ${company.ticker} — não é possível vender ${quantity.toString()}.`
      )
    }
  }

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        profileId: input.profileId,
        companyId: company.id,
        type: input.type,
        quantity,
        priceCents,
        totalCents,
        feesCents: Number(feesCents),
        priceSource,
        isManualPrice,
        date: resolvedDate,
        note,
      },
    })

    await recomputePosition(tx, input.profileId, company.id)

    return transaction
  })
}

/// Dividendos/JSCP — manual amount entry for now (automatic association
/// with DividendPayment history is prepared architecturally but not wired
/// up yet, per this phase's explicit scope).
export async function recordIncome(input: RecordIncomeInput) {
  const company = await requireCompany(input.companyId)

  const quantity = new Prisma.Decimal(input.quantity)
  if (quantity.lte(0)) throw new Error("A quantidade deve ser maior que zero.")
  if (input.amountPerShareCents <= 0) throw new Error("Informe o valor por ação/cota recebido.")

  const totalCents = BigInt(quantity.mul(input.amountPerShareCents).round().toFixed(0))

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        profileId: input.profileId,
        companyId: company.id,
        type: input.type,
        quantity,
        priceCents: input.amountPerShareCents,
        totalCents,
        priceSource: PRICE_SOURCE_MANUAL,
        isManualPrice: true,
        date: input.date,
        note: input.note ?? null,
      },
    })

    await recomputePosition(tx, input.profileId, company.id)

    return transaction
  })
}

/// Bonificação/desdobramento/grupamento — pure quantity adjustments, no
/// cash flow. `quantity` is always the magnitude of shares gained (BONUS/
/// SPLIT) or removed (REVERSE_SPLIT); recomputePosition() applies the sign.
export async function recordAdjustment(input: RecordAdjustmentInput) {
  const company = await requireCompany(input.companyId)

  const quantity = new Prisma.Decimal(input.quantity)
  if (quantity.lte(0)) throw new Error("A quantidade deve ser maior que zero.")

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        profileId: input.profileId,
        companyId: company.id,
        type: input.type,
        quantity,
        priceCents: 0,
        totalCents: BigInt(0),
        priceSource: null,
        date: input.date,
        note: input.note ?? null,
      },
    })

    await recomputePosition(tx, input.profileId, company.id)

    return transaction
  })
}

/// Ownership check is mandatory here — never delete a transaction by ID
/// without confirming it belongs to the requesting profile.
export async function deleteTransaction(profileId: string, transactionId: string): Promise<void> {
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } })
  if (!transaction || transaction.profileId !== profileId) {
    throw new Error("Operação não encontrada.")
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.delete({ where: { id: transactionId } })
    await recomputePosition(tx, profileId, transaction.companyId)
  })
}

/// Full exit — removes the position and its entire transaction history.
export async function removePosition(profileId: string, companyId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.transaction.deleteMany({ where: { profileId, companyId } })
    await tx.portfolioPosition.deleteMany({ where: { profileId, companyId } })
  })
}
