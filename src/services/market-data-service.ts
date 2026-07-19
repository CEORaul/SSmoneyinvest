import "server-only"

import { getMarketDataProvider } from "@/lib/market-data"
import { ProviderManager } from "@/lib/market-data/provider-manager"
import type { CompanyDetails, PriceRange } from "@/lib/market-data/types"
import { validateQuote } from "@/lib/market-data/validation"
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

    const existing = await prisma.company.findMany({
      where: { ticker: { in: entries.map((entry) => entry.ticker) } },
      select: { id: true, ticker: true, priceCents: true },
    })
    const existingByTicker = new Map(existing.map((company) => [company.ticker, company]))

    const CHUNK_SIZE = 50
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE)
      const outcomes = await Promise.allSettled(
        chunk.map(async (entry) => {
          const existingCompany = existingByTicker.get(entry.ticker)

          // No fallback provider exists for bulk directory data (Yahoo has
          // no equivalent listing endpoint) — an implausible row is simply
          // rejected and logged, keeping whatever was there before.
          const validation = validateQuote({
            previousPriceCents: existingCompany?.priceCents ?? null,
            newPriceCents: entry.priceCents,
            priceChangePct: entry.priceChangePct,
            marketCapCents: entry.marketCapCents,
            priceToEarnings: null,
            dividendYieldPct: null,
          })

          if (!validation.valid) {
            if (existingCompany) {
              await prisma.quoteValidationAlert.create({
                data: {
                  companyId: existingCompany.id,
                  provider: entry.source,
                  reasons: validation.reasons,
                  rejectedPriceCents: entry.priceCents,
                  previousPriceCents: existingCompany.priceCents,
                },
              })
            }
            throw new Error(`${entry.ticker}: ${validation.reasons.join("; ")}`)
          }

          const quoteFields = {
            name: entry.name,
            assetClass: entry.assetClass,
            sector: entry.sector,
            segment: entry.segment,
            logoUrl: entry.logoUrl,
            priceCents: entry.priceCents,
            priceChangePct: entry.priceChangePct,
            marketCapCents: entry.marketCapCents,
            lastQuoteProvider: entry.source,
            lastQuoteAt: new Date(),
            lastQuoteAttempts: 1,
            lastQuoteStatus: "OK",
          }

          return prisma.company.upsert({
            where: { ticker: entry.ticker },
            update: quoteFields,
            create: { ticker: entry.ticker, ...quoteFields },
          })
        })
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
  ///
  /// BRAPI is tried first (see provider-registry.ts priorities) and used
  /// alone when its answer passes validateQuote() — Yahoo is never called
  /// in that case. Yahoo only enters the picture two ways: (a) transport-
  /// level failover already built into ProviderManager (BRAPI errored/timed
  /// out — unchanged, pre-existing behavior), or (b) BRAPI answered but the
  /// data looks implausible, in which case this function explicitly asks
  /// the next registered provider for a second opinion before accepting
  /// either one.
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
    let details: CompanyDetails | null
    let latencyMs: number
    const start = Date.now()
    try {
      details = await provider.getCompanyDetails(ticker, range)
      latencyMs = Date.now() - start
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      await this.stampDetailsAttempt(company.id)
      return { ok: false, reason }
    }
    if (!details) {
      await this.stampDetailsAttempt(company.id)
      return { ok: false, reason: `Provedor não retornou dados para ${ticker}` }
    }

    let attempts = 1
    let validation = validateQuote({
      previousPriceCents: company.priceCents,
      newPriceCents: details.priceCents,
      priceChangePct: details.priceChangePct,
      // Not returned by the details endpoint in our mapping — only the
      // directory sync validates market cap/dividend yield.
      marketCapCents: null,
      priceToEarnings: details.priceToEarnings,
      dividendYieldPct: null,
    })

    // "Compare os resultados" — only meaningful when the full multi-
    // provider chain is active (not the MARKET_DATA_PROVIDER debug
    // override, which pins a single provider on purpose).
    if (!validation.valid && provider instanceof ProviderManager) {
      const remainingProviders = provider
        .listRegisteredProviderNames()
        .filter((name) => name !== details!.source)

      for (const candidateName of remainingProviders) {
        attempts += 1
        const attemptStart = Date.now()
        try {
          const alternative = await provider.getCompanyDetailsFrom(candidateName, ticker, range)
          latencyMs = Date.now() - attemptStart
          if (!alternative) continue

          const alternativeValidation = validateQuote({
            previousPriceCents: company.priceCents,
            newPriceCents: alternative.priceCents,
            priceChangePct: alternative.priceChangePct,
            marketCapCents: null,
            priceToEarnings: alternative.priceToEarnings,
            dividendYieldPct: null,
          })

          if (alternativeValidation.valid) {
            details = alternative
            validation = alternativeValidation
            break
          }
        } catch {
          // This candidate failed too — keep trying whatever's left.
        }
      }
    }

    if (!validation.valid) {
      await prisma.quoteValidationAlert.create({
        data: {
          companyId: company.id,
          provider: details.source,
          reasons: validation.reasons,
          rejectedPriceCents: details.priceCents,
          previousPriceCents: company.priceCents,
        },
      })
      await prisma.company.update({
        where: { id: company.id },
        data: {
          detailsSyncedAt: new Date(),
          lastQuoteAttempts: attempts,
          lastQuoteStatus: "REJECTED_KEPT_LAST_VALID",
        },
      })
      return {
        ok: false,
        reason: `Dados de ${ticker} rejeitados na validação (${validation.reasons.join("; ")}) — mantido o último valor válido`,
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.company.update({
          where: { id: company.id },
          data: {
            ...(details!.priceCents != null ? { priceCents: details!.priceCents } : {}),
            ...(details!.priceChangePct != null
              ? { priceChangePct: details!.priceChangePct }
              : {}),
            detailsSyncedAt: new Date(),
            lastQuoteProvider: details!.source,
            lastQuoteAt: new Date(),
            lastQuoteLatencyMs: latencyMs,
            lastQuoteAttempts: attempts,
            lastQuoteStatus: "OK",
          },
        })

        if (company.assetClass === "STOCK" && details!.priceToEarnings != null) {
          await tx.stock.upsert({
            where: { companyId: company.id },
            update: { priceToEarnings: details!.priceToEarnings },
            create: { companyId: company.id, priceToEarnings: details!.priceToEarnings },
          })
        }

        if (details!.priceHistory.length > 0) {
          await tx.priceHistoryPoint.createMany({
            data: details!.priceHistory.map((point) => ({
              companyId: company.id,
              date: point.date,
              closeCents: point.closeCents,
            })),
            skipDuplicates: true,
          })
        }

        if (details!.dividends.length > 0) {
          await tx.dividendPayment.createMany({
            data: details!.dividends.map((dividend) => ({
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
