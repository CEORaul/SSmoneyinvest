import "server-only"

import { AlertService } from "@/features/alerts/alert-service"
import { getMarketDataProvider } from "@/lib/market-data"
import { ProviderManager } from "@/lib/market-data/provider-manager"
import type { CompanyDetails, PriceRange } from "@/lib/market-data/types"
import { validateQuote } from "@/lib/market-data/validation"
import { prisma } from "@/lib/prisma"
import type { Company, Prisma } from "@/generated/prisma/client"

/// Alert-checking must never take down a price sync — a bug in the alerts
/// feature is not a reason to lose an otherwise-successful quote update.
async function checkAlertsSafely(ticker: string, companyId: string, priceCents: number): Promise<void> {
  try {
    await AlertService.checkAlertsForTicker({ ticker, companyId, priceCents })
  } catch {
    // Swallowed on purpose — see the doc comment above.
  }
}

export interface BatchResult {
  processed: number
  failed: number
  errors: string[]
}

type DetailsOutcome = { ok: true; source: string } | { ok: false; reason: string }

// Up to BATCH_TICKER_LIMIT tickers per BrapiProvider request (confirmed
// live on BRAPI Pro) — MarketDataService owns the chunking since the
// provider layer only knows how to serve one request, not how many
// companies a caller ultimately wants refreshed.
const BATCH_TICKER_LIMIT = 20

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
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
      const chunkOfEntries = entries.slice(i, i + CHUNK_SIZE)
      const outcomes = await Promise.allSettled(
        chunkOfEntries.map(async (entry) => {
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
            // A real directory sync just produced this row — self-heals a
            // manually-created company (see findOrCreateManualCompany) the
            // moment a matching real ticker shows up in the provider feed.
            priceSource: "AUTO" as const,
          }

          return prisma.company.upsert({
            where: { ticker: entry.ticker },
            update: quoteFields,
            create: { ticker: entry.ticker, ...quoteFields },
          })
        })
      )

      const alertChecks: Promise<void>[] = []
      for (const outcome of outcomes) {
        if (outcome.status === "fulfilled") {
          result.processed += 1
          alertChecks.push(checkAlertsSafely(outcome.value.ticker, outcome.value.id, outcome.value.priceCents))
        } else {
          result.failed += 1
          result.errors.push(String(outcome.reason))
        }
      }
      await Promise.all(alertChecks)
    }

    return result
  },

  /// Deep per-ticker refresh: price history, dividends, and whatever
  /// fundamentals the provider returns. Requires the company to already
  /// exist (from a directory sync). One HTTP call — prefer
  /// refreshCompanyDetailsBatch for more than one ticker (see
  /// sync-company-details.ts).
  ///
  /// BRAPI is tried first (see provider-registry.ts priorities) and used
  /// alone when its answer passes validateQuote() — Yahoo is never called
  /// in that case. Yahoo only enters the picture two ways: (a) transport-
  /// level failover already built into ProviderManager (BRAPI errored/timed
  /// out — unchanged, pre-existing behavior), or (b) BRAPI answered but the
  /// data looks implausible, in which case applyValidatedDetails explicitly
  /// asks the next registered provider for a second opinion before
  /// accepting either one.
  async refreshCompanyDetails(ticker: string, range: PriceRange = "1y"): Promise<DetailsOutcome> {
    const provider = getMarketDataProvider()

    const company = await prisma.company.findUnique({ where: { ticker } })
    if (!company) {
      return { ok: false, reason: `Empresa ${ticker} não encontrada (rode o sync de diretório primeiro)` }
    }

    // A single ticker failing (provider outage, unmapped symbol) must never
    // take down the rest of a batch — callers loop over many tickers and
    // rely on this always resolving, never rejecting.
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

    return applyValidatedDetails(provider, company, details, latencyMs, 1, range)
  },

  /// Same result as calling refreshCompanyDetails once per ticker, but
  /// batches the actual provider request(s) up to BATCH_TICKER_LIMIT
  /// tickers at a time when the active provider supports it (BRAPI Pro
  /// does — see BrapiProvider.getCompanyDetailsBatch) — this is what turns
  /// a full-universe sync from ~1 request per company into ~1 request per
  /// 20 companies. Falls back to the single-ticker path per-company
  /// whenever: the provider has no batch capability at all, the whole
  /// batch request failed, or a specific ticker was silently absent from
  /// the batch response (BRAPI drops unknown/delisted symbols rather than
  /// erroring the call) — one bad ticker never sinks the rest of the batch.
  async refreshCompanyDetailsBatch(tickers: string[], range: PriceRange = "1y"): Promise<BatchResult> {
    const provider = getMarketDataProvider()
    const result: BatchResult = { processed: 0, failed: 0, errors: [] }

    const companies = await prisma.company.findMany({ where: { ticker: { in: tickers } } })
    const companyByTicker = new Map(companies.map((c) => [c.ticker, c]))

    for (const ticker of tickers) {
      if (!companyByTicker.has(ticker)) {
        result.failed += 1
        result.errors.push(`${ticker}: empresa não encontrada (rode o sync de diretório primeiro)`)
      }
    }
    const knownTickers = tickers.filter((t) => companyByTicker.has(t))
    if (knownTickers.length === 0) return result

    if (!provider.capabilities.batch || !provider.getCompanyDetailsBatch) {
      // No batch capability at all (e.g. MARKET_DATA_PROVIDER=yahoo debug
      // pin) — fall back entirely to the single-ticker path.
      for (const ticker of knownTickers) {
        const outcome = await this.refreshCompanyDetails(ticker, range)
        recordOutcome(result, ticker, outcome)
      }
      return result
    }

    for (const batchOfTickers of chunk(knownTickers, BATCH_TICKER_LIMIT)) {
      const start = Date.now()
      let detailsByTicker: Map<string, CompanyDetails>
      try {
        detailsByTicker = await provider.getCompanyDetailsBatch(batchOfTickers, range)
      } catch {
        detailsByTicker = new Map()
      }
      const latencyMs = Date.now() - start

      for (const ticker of batchOfTickers) {
        const details = detailsByTicker.get(ticker)
        if (!details) {
          // Missing from the batch response — fall back to a single-ticker
          // call for this one symbol rather than failing it outright.
          const outcome = await this.refreshCompanyDetails(ticker, range)
          recordOutcome(result, ticker, outcome)
          continue
        }
        const company = companyByTicker.get(ticker)!
        const outcome = await applyValidatedDetails(provider, company, details, latencyMs, 1, range)
        recordOutcome(result, ticker, outcome)
      }
    }

    return result
  },

  /// The weekly, heavier sync: financial-statement history (Balanço/DRE/
  /// Fluxo de Caixa/DVA, annual + quarterly), real split/bonus-share
  /// history, and richer dividend fields — everything BrapiProvider only
  /// requests via getCompanyStatementsBatch (see that method's own doc for
  /// why this is a separate, less-frequent cadence from the daily
  /// fundamentals sync). No-op with an honest error per ticker when the
  /// active provider doesn't support statements at all (e.g. the Yahoo
  /// debug pin) — never silently skipped.
  async refreshCompanyStatements(tickers: string[], range: PriceRange = "max"): Promise<BatchResult> {
    const provider = getMarketDataProvider()
    const result: BatchResult = { processed: 0, failed: 0, errors: [] }

    const companies = await prisma.company.findMany({ where: { ticker: { in: tickers } } })
    const companyByTicker = new Map(companies.map((c) => [c.ticker, c]))

    for (const ticker of tickers) {
      if (!companyByTicker.has(ticker)) {
        result.failed += 1
        result.errors.push(`${ticker}: empresa não encontrada`)
      }
    }
    const knownTickers = tickers.filter((t) => companyByTicker.has(t))
    if (knownTickers.length === 0) return result

    if (!provider.capabilities.statements || !provider.getCompanyStatementsBatch) {
      for (const ticker of knownTickers) {
        result.failed += 1
        result.errors.push(`${ticker}: provedor atual não expõe demonstrativos financeiros`)
      }
      return result
    }

    for (const batchOfTickers of chunk(knownTickers, BATCH_TICKER_LIMIT)) {
      let detailsByTicker: Map<string, CompanyDetails>
      try {
        detailsByTicker = await provider.getCompanyStatementsBatch(batchOfTickers, range)
      } catch (error) {
        for (const ticker of batchOfTickers) {
          result.failed += 1
          result.errors.push(`${ticker}: ${error instanceof Error ? error.message : String(error)}`)
        }
        continue
      }

      for (const ticker of batchOfTickers) {
        const company = companyByTicker.get(ticker)!
        const details = detailsByTicker.get(ticker)
        if (!details?.statements) {
          await this.stampStatementsAttempt(company.id)
          result.failed += 1
          result.errors.push(`${ticker}: demonstrativos não retornados pelo provedor`)
          continue
        }
        try {
          await applyStatements(company, details)
          result.processed += 1
        } catch (error) {
          await this.stampStatementsAttempt(company.id)
          result.failed += 1
          result.errors.push(`${ticker}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    }

    return result
  },

  /// Marks that a details refresh was attempted for this company, even when
  /// it failed — otherwise a permanently-failing ticker (provider outage,
  /// delisted) would stay at the front of the "oldest first" queue forever
  /// and starve every other company out of its turn in the rotation.
  async stampDetailsAttempt(companyId: string): Promise<void> {
    await prisma.company.update({
      where: { id: companyId },
      data: { detailsSyncedAt: new Date() },
    })
  },

  /// Same purpose as stampDetailsAttempt, for the separate statements
  /// rotation (see sync-company-statements.ts).
  async stampStatementsAttempt(companyId: string): Promise<void> {
    await prisma.company.update({
      where: { id: companyId },
      data: { statementsSyncedAt: new Date() },
    })
  },
}

function recordOutcome(result: BatchResult, ticker: string, outcome: DetailsOutcome): void {
  if (outcome.ok) {
    result.processed += 1
  } else {
    result.failed += 1
    result.errors.push(`${ticker}: ${outcome.reason}`)
  }
}

/// Shared by both the single-ticker and batch details paths: validates the
/// provider's answer, asks other registered providers for a second opinion
/// if it looks implausible, and — once something valid is in hand — writes
/// Company/Stock/Fii/Etf/PriceHistoryPoint/DividendPayment in one
/// transaction. Exactly one write implementation for both call sites, per
/// this project's "no duplicate code" requirement.
async function applyValidatedDetails(
  provider: ReturnType<typeof getMarketDataProvider>,
  company: Company,
  details: CompanyDetails,
  latencyMs: number,
  initialAttempts: number,
  range: PriceRange
): Promise<DetailsOutcome> {
  let attempts = initialAttempts
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

  // "Compare os resultados" — only meaningful when the full multi-provider
  // chain is active (not the MARKET_DATA_PROVIDER debug override, which
  // pins a single provider on purpose).
  if (!validation.valid && provider instanceof ProviderManager) {
    const remainingProviders = provider.listRegisteredProviderNames().filter((name) => name !== details.source)

    for (const candidateName of remainingProviders) {
      attempts += 1
      const attemptStart = Date.now()
      try {
        const alternative = await provider.getCompanyDetailsFrom(candidateName, company.ticker, range)
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
      reason: `Dados de ${company.ticker} rejeitados na validação (${validation.reasons.join("; ")}) — mantido o último valor válido`,
    }
  }

  // description/sector/employees/website live on Company, not Stock — split
  // them out of the modules-derived block before it goes anywhere near
  // tx.stock.upsert.
  const { description, sector, employees, website, ...stockFundamentals } = details.stock ?? {
    description: null,
    sector: null,
    employees: null,
    website: null,
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.company.update({
          where: { id: company.id },
          data: {
            ...(details.priceCents != null ? { priceCents: details.priceCents } : {}),
            ...(details.priceChangePct != null ? { priceChangePct: details.priceChangePct } : {}),
            ...(details.dayHighCents != null ? { dayHighCents: details.dayHighCents } : {}),
            ...(details.dayLowCents != null ? { dayLowCents: details.dayLowCents } : {}),
            ...(details.fiftyTwoWeekHighCents != null ? { fiftyTwoWeekHighCents: details.fiftyTwoWeekHighCents } : {}),
            ...(details.fiftyTwoWeekLowCents != null ? { fiftyTwoWeekLowCents: details.fiftyTwoWeekLowCents } : {}),
            ...(details.volume != null ? { volume: details.volume } : {}),
            ...(description != null ? { description } : {}),
            ...(sector != null ? { sector } : {}),
            ...(employees != null ? { employees } : {}),
            ...(website != null ? { website } : {}),
            detailsSyncedAt: new Date(),
            lastQuoteProvider: details.source,
            lastQuoteAt: new Date(),
            lastQuoteLatencyMs: latencyMs,
            lastQuoteAttempts: attempts,
            lastQuoteStatus: "OK",
          },
        })

        // BDRs get the same Stock-shaped fundamentals row as ordinary
        // stocks — there was previously no Stock row for BDRs at all,
        // silently leaving every indicator card empty for that whole
        // category regardless of what the provider actually returned.
        if (company.assetClass === "STOCK" || company.assetClass === "BDR") {
          const stockFields = Object.fromEntries(
            Object.entries({
              priceToEarnings: details.priceToEarnings,
              ...stockFundamentals,
            }).filter(([, value]) => value != null)
          )
          if (Object.keys(stockFields).length > 0) {
            await tx.stock.upsert({
              where: { companyId: company.id },
              update: stockFields,
              create: { companyId: company.id, ...stockFields },
            })
          }
        }

        if (company.assetClass === "FII" && details.fii) {
          const fiiFields = Object.fromEntries(Object.entries(details.fii).filter(([, value]) => value != null))
          if (Object.keys(fiiFields).length > 0) {
            await tx.fii.upsert({
              where: { companyId: company.id },
              update: fiiFields,
              create: { companyId: company.id, ...fiiFields },
            })
          }
        }

        if (company.assetClass === "ETF" && details.etf) {
          const etfFields = Object.fromEntries(Object.entries(details.etf).filter(([, value]) => value != null))
          if (Object.keys(etfFields).length > 0) {
            await tx.etf.upsert({
              where: { companyId: company.id },
              update: etfFields,
              create: { companyId: company.id, ...etfFields },
            })
          }
        }

        if (details.priceHistory.length > 0) {
          await tx.priceHistoryPoint.createMany({
            data: details.priceHistory.map((point) => ({
              companyId: company.id,
              date: point.date,
              closeCents: point.closeCents,
              volume: point.volume,
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
              relatedTo: dividend.relatedTo,
              isinCode: dividend.isinCode,
              remarks: dividend.remarks,
              approvedOn: dividend.approvedOn,
            })),
            skipDuplicates: true,
          })
        }

        if (details.splits.length > 0) {
          await tx.stockSplitEvent.createMany({
            data: details.splits.map((split) => ({
              companyId: company.id,
              type: split.type,
              factor: split.factor,
              completeFactor: split.completeFactor,
              isinCode: split.isinCode,
              approvedOn: split.approvedOn,
              lastDatePrior: split.lastDatePrior,
            })),
            skipDuplicates: true,
          })
        }
      },
      // Prisma's 5s default timeout was fine while every sync topped out
      // around 250 rows (the old "1y" default); requesting "max" for a
      // company with decades of history (see sync-company-details.ts) can
      // mean a 6,000+ row createMany, which measured ~5.9s under load —
      // confirmed live this genuinely timed out at the default before
      // this change. 30s gives real headroom without masking an actually
      // stuck transaction.
      { timeout: 30_000 }
    )
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    await marketDataService.stampDetailsAttempt(company.id)
    return { ok: false, reason }
  }

  await checkAlertsSafely(company.ticker, company.id, details.priceCents ?? company.priceCents)

  return { ok: true, source: details.source }
}

/// Writes every statement-history array + splits (already fetched via
/// getCompanyStatementsBatch) for one company, then computes the handful
/// of indicators that need statement history rather than a single quote
/// response (ROIC, EV/EBIT, CAGRs, Payout) and upserts them onto Stock.
/// Only ever called for STOCK/BDR — FIIs/ETFs have no corporate financial
/// statements to speak of.
async function applyStatements(company: Company, details: CompanyDetails): Promise<void> {
  const statements = details.statements!

  const asRow = (p: { endDate: Date; curated: Record<string, number | null>; raw: Record<string, unknown> }, period: "ANNUAL" | "QUARTERLY") => ({
    companyId: company.id,
    period,
    endDate: p.endDate,
    ...p.curated,
    // BRAPI's period objects are already the result of JSON.parse, so this
    // is a real JSON value, not an arbitrary unknown — the cast just
    // satisfies Prisma's InputJsonValue type, it doesn't change the data.
    raw: p.raw as Prisma.InputJsonValue,
  })

  await prisma.$transaction(
    async (tx) => {
      if (statements.balanceSheet.length > 0) {
        await tx.balanceSheetStatement.createMany({
          data: statements.balanceSheet.map((p) => asRow(p, "ANNUAL")),
          skipDuplicates: true,
        })
      }
      if (statements.balanceSheetQuarterly.length > 0) {
        await tx.balanceSheetStatement.createMany({
          data: statements.balanceSheetQuarterly.map((p) => asRow(p, "QUARTERLY")),
          skipDuplicates: true,
        })
      }
      if (statements.incomeStatement.length > 0) {
        await tx.incomeStatement.createMany({
          data: statements.incomeStatement.map((p) => asRow(p, "ANNUAL")),
          skipDuplicates: true,
        })
      }
      if (statements.incomeStatementQuarterly.length > 0) {
        await tx.incomeStatement.createMany({
          data: statements.incomeStatementQuarterly.map((p) => asRow(p, "QUARTERLY")),
          skipDuplicates: true,
        })
      }
      if (statements.cashFlow.length > 0) {
        await tx.cashFlowStatement.createMany({
          data: statements.cashFlow.map((p) => asRow(p, "ANNUAL")),
          skipDuplicates: true,
        })
      }
      if (statements.cashFlowQuarterly.length > 0) {
        await tx.cashFlowStatement.createMany({
          data: statements.cashFlowQuarterly.map((p) => asRow(p, "QUARTERLY")),
          skipDuplicates: true,
        })
      }
      if (statements.valueAdded.length > 0) {
        await tx.valueAddedStatement.createMany({
          data: statements.valueAdded.map((p) => asRow(p, "ANNUAL")),
          skipDuplicates: true,
        })
      }
      if (statements.valueAddedQuarterly.length > 0) {
        await tx.valueAddedStatement.createMany({
          data: statements.valueAddedQuarterly.map((p) => asRow(p, "QUARTERLY")),
          skipDuplicates: true,
        })
      }

      if (details.splits.length > 0) {
        await tx.stockSplitEvent.createMany({
          data: details.splits.map((split) => ({
            companyId: company.id,
            type: split.type,
            factor: split.factor,
            completeFactor: split.completeFactor,
            isinCode: split.isinCode,
            approvedOn: split.approvedOn,
            lastDatePrior: split.lastDatePrior,
          })),
          skipDuplicates: true,
        })
      }

      // Same table/pattern DividendPayment already uses — the weekly
      // request's dividendsData is a superset of the daily one (richer
      // fields), so re-inserting is a harmless skipDuplicates no-op for
      // events the daily sync already wrote.
      if (details.dividends.length > 0) {
        await tx.dividendPayment.createMany({
          data: details.dividends.map((dividend) => ({
            companyId: company.id,
            type: dividend.type,
            amountPerShare: dividend.amountPerShare,
            exDate: dividend.exDate,
            paymentDate: dividend.paymentDate,
            relatedTo: dividend.relatedTo,
            isinCode: dividend.isinCode,
            remarks: dividend.remarks,
            approvedOn: dividend.approvedOn,
          })),
          skipDuplicates: true,
        })
      }

      if (company.assetClass === "STOCK" || company.assetClass === "BDR") {
        const derived = computeStatementDerivedIndicators(statements, details.dividends, details.stock?.sharesOutstanding ?? null)
        const stockFields = Object.fromEntries(Object.entries(derived).filter(([, value]) => value != null))
        if (Object.keys(stockFields).length > 0) {
          await tx.stock.upsert({
            where: { companyId: company.id },
            update: stockFields,
            create: { companyId: company.id, ...stockFields },
          })
        }
      }

      await tx.company.update({ where: { id: company.id }, data: { statementsSyncedAt: new Date() } })
    },
    // Up to 8 statement arrays (annual + quarterly × 4 types), some with
    // 60+ periods each, plus splits/dividends — the same large-createMany
    // rationale as applyValidatedDetails' own 30s timeout above.
    { timeout: 30_000 }
  )
}

type StatementsBundle = NonNullable<CompanyDetails["statements"]>

/// ROIC, EV/EBIT, revenueCagr3y, netIncomeCagr3y, and Payout all need
/// statement/dividend history beyond a single quote response — computed
/// here, once, from real components (never estimated). Every result is
/// null when an input is missing, exactly like every other "sourced but
/// currently null" indicator in this app.
function computeStatementDerivedIndicators(
  statements: StatementsBundle,
  dividends: CompanyDetails["dividends"],
  sharesOutstanding: bigint | null
): {
  roic: number | null
  evToEbit: number | null
  revenueCagr3y: number | null
  netIncomeCagr3y: number | null
  equityCents: bigint | null
  payout: number | null
} {
  const annualIncome = [...statements.incomeStatement].sort((a, b) => b.endDate.getTime() - a.endDate.getTime())
  const annualBalance = [...statements.balanceSheet].sort((a, b) => b.endDate.getTime() - a.endDate.getTime())

  const latestIncome = annualIncome[0]
  const latestBalance = annualBalance[0]

  const ebitCents = latestIncome?.curated.ebitCents ?? null
  const incomeBeforeTaxCents = latestIncome?.curated.incomeBeforeTaxCents ?? null
  const incomeTaxExpenseCents = latestIncome?.curated.incomeTaxExpenseCents ?? null
  const totalEquityCents = latestBalance?.curated.totalEquityCents ?? null
  const totalLiabilitiesCents = latestBalance?.curated.totalLiabilitiesCents ?? null

  // NOPAT = EBIT × (1 − taxa efetiva); Capital Investido ≈ Patrimônio
  // Líquido + Passivo Total — an approximation of total invested capital
  // from real balance-sheet components (not the textbook "total debt"
  // figure, which this schema doesn't isolate at the statement level, but
  // a real derivation nonetheless, never a guessed constant).
  const roic =
    ebitCents != null && incomeBeforeTaxCents != null && incomeTaxExpenseCents != null && totalEquityCents != null
      ? (() => {
          const effectiveTaxRate = incomeBeforeTaxCents !== 0 ? incomeTaxExpenseCents / incomeBeforeTaxCents : 0
          const nopat = ebitCents * (1 - effectiveTaxRate)
          const investedCapital = totalEquityCents + (totalLiabilitiesCents ?? 0)
          return investedCapital !== 0 ? (nopat / investedCapital) * 100 : null
        })()
      : null

  const revenueCagr3y = computeCagr(annualIncome, "totalRevenueCents")
  const netIncomeCagr3y = computeCagr(annualIncome, "netIncomeCents")

  // Payout = dividendos pagos nos últimos 12 meses (por ação × ações em
  // circulação) ÷ lucro líquido do último exercício anual — every input is
  // a real figure already in hand (dividend history just synced,
  // sharesOutstanding from the same response's defaultKeyStatistics,
  // netIncomeCents from the latest annual income statement), never
  // estimated from a partial year.
  const netIncomeCents = latestIncome?.curated.netIncomeCents ?? null
  const payout = (() => {
    if (netIncomeCents == null || netIncomeCents === 0 || sharesOutstanding == null) return null
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const trailingDividendPerShare = dividends
      .filter((d) => d.exDate >= oneYearAgo)
      .reduce((sum, d) => sum + d.amountPerShare, 0)
    if (trailingDividendPerShare <= 0) return null
    // dividendPerShare is a real currency value (not cents) — convert to
    // cents before comparing against the cents-denominated netIncomeCents.
    const totalDividendsCents = trailingDividendPerShare * Number(sharesOutstanding) * 100
    return (totalDividendsCents / netIncomeCents) * 100
  })()

  return {
    roic,
    // enterpriseValue isn't part of the statements bundle itself (it's a
    // defaultKeyStatistics field from the same weekly response) — left for
    // a future pass once that value is threaded through here; evToEbit
    // stays honestly null rather than guessed in the meantime.
    evToEbit: null,
    revenueCagr3y,
    netIncomeCagr3y,
    // Prefer the real balance-sheet equity figure over the bookValue×shares
    // approximation the daily sync uses, once real statement history exists.
    equityCents: totalEquityCents != null ? BigInt(Math.round(totalEquityCents)) : null,
    payout,
  }
}

function computeCagr(
  annualPeriodsNewestFirst: StatementsBundle["incomeStatement"],
  field: "totalRevenueCents" | "netIncomeCents"
): number | null {
  if (annualPeriodsNewestFirst.length < 4) return null
  const newest = annualPeriodsNewestFirst[0].curated[field]
  const oldest = annualPeriodsNewestFirst[3].curated[field]
  if (newest == null || oldest == null || oldest <= 0 || newest <= 0) return null
  return (Math.pow(newest / oldest, 1 / 3) - 1) * 100
}
