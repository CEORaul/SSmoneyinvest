import "server-only"

import { getMarketDataProvider } from "@/lib/market-data"
import type { PriceRange } from "@/lib/market-data/types"
import { prisma } from "@/lib/prisma"

export interface BatchResult {
  processed: number
  failed: number
  errors: string[]
}

/// The ONLY code allowed to talk to the market-data provider. Every page,
/// Server Action or query reads from Postgres — Postgres itself is the
/// cache, kept warm by the sync jobs in src/features/market-sync/. Nothing
/// in the request/render path ever calls the provider directly, so user
/// traffic can never hammer the external API or blow through its rate limit.
export const marketDataService = {
  /// Cheap, unauthenticated bulk pull covering the whole known B3 universe
  /// (stocks/FIIs/ETFs). Upserts every Company row — this is both "buscar
  /// empresas automaticamente" and the baseline periodic price refresh,
  /// since brapi's directory endpoint bundles both in one call.
  async refreshCompanyDirectory(): Promise<BatchResult> {
    const provider = getMarketDataProvider()
    const entries = await provider.listCompanyDirectory()

    const result: BatchResult = { processed: 0, failed: 0, errors: [] }

    const CHUNK_SIZE = 50
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE)
      const outcomes = await Promise.allSettled(
        chunk.map((entry) =>
          prisma.company.upsert({
            where: { ticker: entry.ticker },
            update: {
              name: entry.name,
              assetClass: entry.assetClass,
              sector: entry.sector,
              segment: entry.segment,
              logoUrl: entry.logoUrl,
              priceCents: entry.priceCents,
              priceChangePct: entry.priceChangePct,
              marketCapCents: entry.marketCapCents,
            },
            create: {
              ticker: entry.ticker,
              name: entry.name,
              assetClass: entry.assetClass,
              sector: entry.sector,
              segment: entry.segment,
              logoUrl: entry.logoUrl,
              priceCents: entry.priceCents,
              priceChangePct: entry.priceChangePct,
              marketCapCents: entry.marketCapCents,
            },
          })
        )
      )

      for (const outcome of outcomes) {
        if (outcome.status === "fulfilled") {
          result.processed += 1
        } else {
          result.failed += 1
          result.errors.push(String(outcome.reason))
        }
      }
    }

    return result
  },

  /// Deep per-ticker refresh: price history, dividends, and whatever
  /// fundamentals the provider returns. Requires the company to already
  /// exist (from a directory sync) and, for anything beyond the provider's
  /// free sandbox tickers, a configured API token.
  async refreshCompanyDetails(
    ticker: string,
    range: PriceRange = "1y"
  ): Promise<{ ok: true; source: string } | { ok: false; reason: string }> {
    const provider = getMarketDataProvider()

    const company = await prisma.company.findUnique({ where: { ticker } })
    if (!company) {
      return { ok: false, reason: `Empresa ${ticker} não encontrada (rode o sync de diretório primeiro)` }
    }

    // A single ticker failing (missing token, provider outage, unmapped
    // symbol) must never take down the rest of the batch — callers loop
    // over many tickers and rely on this always resolving, never rejecting.
    let details
    try {
      details = await provider.getCompanyDetails(ticker, range)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      await this.stampDetailsAttempt(company.id)
      return { ok: false, reason }
    }
    if (!details) {
      await this.stampDetailsAttempt(company.id)
      return { ok: false, reason: `Provedor não retornou dados para ${ticker}` }
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.company.update({
          where: { id: company.id },
          data: {
            ...(details.priceCents != null ? { priceCents: details.priceCents } : {}),
            ...(details.priceChangePct != null
              ? { priceChangePct: details.priceChangePct }
              : {}),
            detailsSyncedAt: new Date(),
          },
        })

        if (company.assetClass === "STOCK" && details.priceToEarnings != null) {
          await tx.stock.upsert({
            where: { companyId: company.id },
            update: { priceToEarnings: details.priceToEarnings },
            create: { companyId: company.id, priceToEarnings: details.priceToEarnings },
          })
        }

        if (details.priceHistory.length > 0) {
          await tx.priceHistoryPoint.createMany({
            data: details.priceHistory.map((point) => ({
              companyId: company.id,
              date: point.date,
              closeCents: point.closeCents,
            })),
            skipDuplicates: true,
          })
        }

        if (details.dividends.length > 0) {
          await tx.dividendPayment.createMany({
            data: details.dividends.map((dividend) => ({
              companyId: company.id,
              type: dividend.type,
              amountPerShare: dividend.amountPerShare,
              exDate: dividend.exDate,
              paymentDate: dividend.paymentDate,
            })),
            skipDuplicates: true,
          })
        }
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      await this.stampDetailsAttempt(company.id)
      return { ok: false, reason }
    }

    return { ok: true, source: details.source }
  },

  /// Marks that a details refresh was attempted for this company, even when
  /// it failed — otherwise a permanently-failing ticker (no token, delisted)
  /// would stay at the front of the "oldest first" queue forever and starve
  /// every other company out of its turn in the rotation.
  async stampDetailsAttempt(companyId: string): Promise<void> {
    await prisma.company.update({
      where: { id: companyId },
      data: { detailsSyncedAt: new Date() },
    })
  },
}
