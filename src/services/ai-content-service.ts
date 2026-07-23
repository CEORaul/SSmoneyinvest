import "server-only"

import { createHash } from "crypto"

import type { AiQuestionType } from "@/generated/prisma/client"
import { AI_MODEL, generateText } from "@/lib/ai/gemini-client"
import { getIndicatorsForAssetClass } from "@/features/company/indicators"
import type { CompanyDetailDTO } from "@/features/company/queries"
import { translateSector } from "@/features/company/sector-labels"
import { prisma } from "@/lib/prisma"

const CACHE_TTL_DAYS = 30
// Radar's facts (daily price change, dividends this month...) already
// change day to day, so sourceHash is the primary invalidation path here
// too — this TTL just caps how long an unchanged summary (e.g. a weekend
// with no new facts) is shown before a forced refresh.
const RADAR_CACHE_TTL_HOURS = 20

/// "O que é?"/"Como calcular?" answers don't depend on this specific
/// company's numbers — they're cached once per (assetClass, indicatorKey)
/// and shared by every company, cutting real API cost. The other three
/// question types reference the actual value/sector comparison and always
/// get their own per-company row.
const GENERIC_QUESTION_TYPES: AiQuestionType[] = ["WHAT_IS", "HOW_CALCULATE"]

const SYSTEM_PERSONA =
  "Você é um educador financeiro neutro e didático, especializado no mercado brasileiro. " +
  "Responda em português do Brasil, em 2 a 4 frases. Nunca inclua recomendação de compra ou " +
  "venda. Baseie-se apenas nos dados fornecidos nesta mensagem — nunca mencione, estime ou " +
  "invente nenhum dado que não foi fornecido explicitamente."

function hashInputs(parts: Array<string | number | null | undefined>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32)
}

function expiresAt(): Date {
  return new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000)
}

function isFresh(row: { sourceHash: string; expiresAt: Date | null }, sourceHash: string): boolean {
  if (row.sourceHash !== sourceHash) return false
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return false
  return true
}

/// "The only code allowed to call the AI provider" — mirrors
/// MarketDataService's exclusivity over BRAPI/Yahoo. Every entry point here
/// catches its own failures and returns null; nothing ever propagates an
/// error up into a page render, and nothing ever fabricates a substitute
/// for real AI output.
export const aiContentService = {
  async getOrGenerateCompanySummary(
    dto: CompanyDetailDTO
  ): Promise<{ text: string; generatedAt: Date } | null> {
    try {
      const sourceHash = hashInputs([
        dto.priceCents,
        dto.priceChangePct,
        dto.sector,
        dto.stock?.roe,
        dto.stock?.netMargin,
        dto.stock?.priceToEarnings,
        dto.stock?.dividendYield ?? dto.fii?.dividendYield ?? dto.etf?.dividendYield,
      ])

      const cacheWhere = {
        companyId: dto.id,
        kind: "SUMMARY" as const,
        assetClass: null,
        indicatorKey: null,
        questionType: null,
      }

      const cached = await prisma.aiContent.findFirst({ where: cacheWhere })
      if (cached && isFresh(cached, sourceHash)) {
        return { text: cached.content, generatedAt: cached.generatedAt }
      }

      const knownFacts = buildKnownFactsList(dto)
      if (knownFacts.length === 0) return null

      const text = await generateText({
        system: SYSTEM_PERSONA,
        prompt:
          `Escreva um "Resumo Inteligente" de 2 a 3 frases sobre ${dto.name} (${dto.ticker}), ` +
          `com base apenas nestes dados:\n${knownFacts.join("\n")}`,
        maxTokens: 300,
      })

      const saved = cached
        ? await prisma.aiContent.update({
            where: { id: cached.id },
            data: { content: text, model: AI_MODEL, sourceHash, expiresAt: expiresAt(), generatedAt: new Date() },
          })
        : await prisma.aiContent.create({
            data: { ...cacheWhere, content: text, model: AI_MODEL, sourceHash, expiresAt: expiresAt() },
          })

      return { text: saved.content, generatedAt: saved.generatedAt }
    } catch {
      return null
    }
  },

  async getOrGenerateIndicatorExplanation(
    dto: CompanyDetailDTO,
    indicatorKey: string,
    questionType: AiQuestionType,
    sectorAverage: { average: number; sampleSize: number } | null
  ): Promise<{ text: string; generatedAt: Date } | null> {
    try {
      const definition = getIndicatorsForAssetClass(dto.assetClass).find((i) => i.key === indicatorKey)
      if (!definition) return null

      const isGeneric = GENERIC_QUESTION_TYPES.includes(questionType)
      const value = definition.getValue(dto)

      const sourceHash = isGeneric
        ? hashInputs([dto.assetClass, indicatorKey, questionType])
        : hashInputs([dto.assetClass, indicatorKey, questionType, value, sectorAverage?.average])

      const cacheKey = {
        companyId: isGeneric ? null : dto.id,
        kind: "INDICATOR_EXPLANATION" as const,
        assetClass: isGeneric ? dto.assetClass : null,
        indicatorKey,
        questionType,
      }

      const cached = await prisma.aiContent.findFirst({ where: cacheKey })
      if (cached && isFresh(cached, sourceHash)) {
        return { text: cached.content, generatedAt: cached.generatedAt }
      }

      const prompt = buildIndicatorPrompt({
        definition,
        questionType,
        value,
        ticker: dto.ticker,
        sector: dto.sector,
        sectorAverage,
      })
      if (!prompt) return null

      const text = await generateText({ system: SYSTEM_PERSONA, prompt, maxTokens: 300 })

      const saved = cached
        ? await prisma.aiContent.update({
            where: { id: cached.id },
            data: { content: text, model: AI_MODEL, sourceHash, expiresAt: expiresAt(), generatedAt: new Date() },
          })
        : await prisma.aiContent.create({
            data: { ...cacheKey, content: text, model: AI_MODEL, sourceHash, expiresAt: expiresAt() },
          })

      return { text: saved.content, generatedAt: saved.generatedAt }
    } catch {
      return null
    }
  },

  /// "Resumo Executivo" at the top of /comparar — 3-4 sentences, cached by
  /// comparisonKey (sorted, comma-joined tickers) so the same set of
  /// companies hits cache regardless of URL order.
  async getOrGenerateComparisonSummary(
    companies: CompanyDetailDTO[]
  ): Promise<{ text: string; generatedAt: Date } | null> {
    try {
      const comparisonKey = toComparisonKey(companies)
      const factsBlock = buildComparisonFactsBlock(companies)
      if (!factsBlock) return null

      const sourceHash = hashComparisonInputs(companies)
      const cacheWhere = {
        companyId: null,
        kind: "COMPARISON_SUMMARY" as const,
        assetClass: null,
        indicatorKey: null,
        questionType: null,
        comparisonKey,
      }

      const cached = await prisma.aiContent.findFirst({ where: cacheWhere })
      if (cached && isFresh(cached, sourceHash)) {
        return { text: cached.content, generatedAt: cached.generatedAt }
      }

      const text = await generateText({
        system: SYSTEM_PERSONA,
        prompt:
          `Escreva um "Resumo Executivo" de 3 a 4 frases comparando estes ativos, com base ` +
          `apenas nos dados fornecidos. Destaque diferenças concretas (ex.: maior crescimento, ` +
          `menor múltiplo, maior dividend yield) somente quando os dados permitirem a comparação ` +
          `direta:\n${factsBlock}`,
        maxTokens: 400,
      })

      const saved = cached
        ? await prisma.aiContent.update({
            where: { id: cached.id },
            data: { content: text, model: AI_MODEL, sourceHash, expiresAt: expiresAt(), generatedAt: new Date() },
          })
        : await prisma.aiContent.create({
            data: { ...cacheWhere, content: text, model: AI_MODEL, sourceHash, expiresAt: expiresAt() },
          })

      return { text: saved.content, generatedAt: saved.generatedAt }
    } catch {
      return null
    }
  },

  /// "Analisar Comparação" button — a structured, multi-dimension analysis.
  /// Same cache shape as the summary, different AiContentKind/prompt/token
  /// budget (kept as a separate function rather than a mode flag, since the
  /// two diverge enough that branching would just move the complexity).
  async getOrGenerateComparisonAnalysis(
    companies: CompanyDetailDTO[]
  ): Promise<{ text: string; generatedAt: Date } | null> {
    try {
      const comparisonKey = toComparisonKey(companies)
      const factsBlock = buildComparisonFactsBlock(companies)
      if (!factsBlock) return null

      const sourceHash = hashComparisonInputs(companies)
      const cacheWhere = {
        companyId: null,
        kind: "COMPARISON_ANALYSIS" as const,
        assetClass: null,
        indicatorKey: null,
        questionType: null,
        comparisonKey,
      }

      const cached = await prisma.aiContent.findFirst({ where: cacheWhere })
      if (cached && isFresh(cached, sourceHash)) {
        return { text: cached.content, generatedAt: cached.generatedAt }
      }

      const text = await generateText({
        system: SYSTEM_PERSONA,
        prompt:
          "Analise esta comparação de ativos com base apenas nos dados fornecidos abaixo. " +
          "Estruture a resposta em tópicos curtos: (1) Resumo geral, (2) Pontos fortes de cada " +
          "ativo, (3) Pontos fracos de cada ativo, (4) Principais diferenças, (5) Quem lidera em " +
          "rentabilidade, crescimento, distribuição de dividendos, endividamento e eficiência " +
          "(ROE/ROIC) — cite qual ativo lidera em cada dimensão apenas quando os dados de todos " +
          'os ativos comparados permitirem essa conclusão; caso contrário, escreva explicitamente ' +
          '"não é possível comparar" para aquela dimensão, sem estimar um valor. Use linguagem ' +
          `simples, sem recomendação de compra ou venda:\n${factsBlock}`,
        maxTokens: 700,
      })

      const saved = cached
        ? await prisma.aiContent.update({
            where: { id: cached.id },
            data: { content: text, model: AI_MODEL, sourceHash, expiresAt: expiresAt(), generatedAt: new Date() },
          })
        : await prisma.aiContent.create({
            data: { ...cacheWhere, content: text, model: AI_MODEL, sourceHash, expiresAt: expiresAt() },
          })

      return { text: saved.content, generatedAt: saved.generatedAt }
    } catch {
      return null
    }
  },

  /// "Radar do Dia" button + "IA Financeira" card on /radar — both read
  /// this same cached row (one generation per profile per day), so
  /// whichever surface the user hits first warms the cache for the other.
  /// `facts` is built by the caller (radar/actions.ts) from data it already
  /// fetched via getPortfolioSummary/computeTopMovers/etc — this function
  /// never queries the portfolio itself.
  async getOrGenerateRadarSummary(
    profileId: string,
    facts: string[]
  ): Promise<{ text: string; generatedAt: Date } | null> {
    try {
      if (facts.length === 0) return null

      const sourceHash = hashInputs(facts)
      const cacheWhere = {
        companyId: null,
        kind: "RADAR_SUMMARY" as const,
        assetClass: null,
        indicatorKey: null,
        questionType: null,
        comparisonKey: null,
        profileId,
      }

      const cached = await prisma.aiContent.findFirst({ where: cacheWhere })
      if (cached && isFresh(cached, sourceHash)) {
        return { text: cached.content, generatedAt: cached.generatedAt }
      }

      const text = await generateText({
        system: SYSTEM_PERSONA,
        prompt:
          `Escreva um "Radar do Dia" de 2 a 4 frases resumindo a carteira de investimentos do ` +
          `usuário hoje, com base apenas nestes dados:\n${facts.join("\n")}`,
        maxTokens: 300,
      })

      const saved = cached
        ? await prisma.aiContent.update({
            where: { id: cached.id },
            data: {
              content: text,
              model: AI_MODEL,
              sourceHash,
              expiresAt: new Date(Date.now() + RADAR_CACHE_TTL_HOURS * 60 * 60 * 1000),
              generatedAt: new Date(),
            },
          })
        : await prisma.aiContent.create({
            data: {
              ...cacheWhere,
              content: text,
              model: AI_MODEL,
              sourceHash,
              expiresAt: new Date(Date.now() + RADAR_CACHE_TTL_HOURS * 60 * 60 * 1000),
            },
          })

      return { text: saved.content, generatedAt: saved.generatedAt }
    } catch {
      return null
    }
  },
}

function toComparisonKey(companies: CompanyDetailDTO[]): string {
  return [...companies.map((c) => c.ticker)].sort().join(",")
}

/// Sorted by ticker (not the caller's array order, which mirrors URL/chip
/// order) so the same set of companies in a different order hashes
/// identically — this is what makes the comparisonKey cache lookup truly
/// order-independent instead of just sharing a key that then always misses.
function sortedByTicker(companies: CompanyDetailDTO[]): CompanyDetailDTO[] {
  return [...companies].sort((a, b) => a.ticker.localeCompare(b.ticker))
}

function hashComparisonInputs(companies: CompanyDetailDTO[]): string {
  return hashInputs([
    toComparisonKey(companies),
    ...sortedByTicker(companies).flatMap((c) => [
      c.priceCents,
      c.priceChangePct,
      c.sector,
      c.stock?.roe,
      c.stock?.roic,
      c.stock?.netMargin,
      c.stock?.priceToEarnings,
      c.stock?.netDebtToEbitda,
      c.stock?.revenueCagr3y,
      c.stock?.dividendYield ?? c.fii?.dividendYield ?? c.etf?.dividendYield,
    ]),
  ])
}

/// Generalizes buildKnownFactsList into a per-company block under a
/// "### {ticker}" heading — same non-null-gated fact-building, just applied
/// N times and joined. Returns "" (never generated, never prompted) when
/// every company's own facts list is empty. Sorted by ticker (not caller
/// order) so the exact same prompt — and therefore the exact same cache
/// entry — is produced regardless of which order the tickers appear in
/// the /comparar URL.
function buildComparisonFactsBlock(companies: CompanyDetailDTO[]): string {
  const blocks = sortedByTicker(companies)
    .map((company) => {
      const facts = buildKnownFactsList(company)
      if (facts.length === 0) return null
      return `### ${company.ticker} (${company.name})\n${facts.join("\n")}`
    })
    .filter((block): block is string => block != null)

  return blocks.join("\n\n")
}

function buildKnownFactsList(dto: CompanyDetailDTO): string[] {
  const facts: string[] = []
  if (dto.sector) facts.push(`Setor: ${translateSector(dto.sector)}`)
  if (dto.segment) facts.push(`Segmento: ${dto.segment}`)
  facts.push(`Preço atual: R$ ${(dto.priceCents / 100).toFixed(2)}`)
  facts.push(`Variação: ${dto.priceChangePct.toFixed(2)}%`)
  if (dto.marketCapCents != null) facts.push(`Market cap: R$ ${(Number(dto.marketCapCents) / 100).toLocaleString("pt-BR")}`)
  if (dto.stock?.priceToEarnings != null) facts.push(`P/L: ${dto.stock.priceToEarnings.toFixed(2)}`)
  if (dto.stock?.roe != null) facts.push(`ROE: ${dto.stock.roe.toFixed(2)}%`)
  if (dto.stock?.netMargin != null) facts.push(`Margem líquida: ${dto.stock.netMargin.toFixed(2)}%`)
  if (dto.stock?.dividendYield != null) facts.push(`Dividend Yield: ${dto.stock.dividendYield.toFixed(2)}%`)
  if (dto.stock?.netDebtToEbitda != null) facts.push(`Dívida líquida/EBITDA: ${dto.stock.netDebtToEbitda.toFixed(2)}x`)
  if (dto.fii?.dividendYield != null) facts.push(`Dividend Yield: ${dto.fii.dividendYield.toFixed(2)}%`)
  if (dto.fii?.vacancyRate != null) facts.push(`Vacância: ${dto.fii.vacancyRate.toFixed(2)}%`)
  return facts
}

function buildIndicatorPrompt(input: {
  definition: { label: string; unit: string }
  questionType: AiQuestionType
  value: number | null
  ticker: string
  sector: string | null
  sectorAverage: { average: number; sampleSize: number } | null
}): string | null {
  const { definition, questionType, value, ticker, sectorAverage } = input
  const sector = translateSector(input.sector)

  switch (questionType) {
    case "WHAT_IS":
      return `Explique de forma simples o que é o indicador "${definition.label}" no contexto de investimentos.`
    case "HOW_CALCULATE":
      return `Explique de forma simples como o indicador "${definition.label}" é calculado.`
    case "HOW_INTERPRET":
      if (value == null) return null
      return `O indicador "${definition.label}" de ${ticker} é ${value.toFixed(2)}. Explique como interpretar esse valor.`
    case "IS_HIGH":
      if (value == null) return null
      return sectorAverage
        ? `O indicador "${definition.label}" de ${ticker} é ${value.toFixed(2)}, e a média do setor "${sector}" (${sectorAverage.sampleSize} empresas) é ${sectorAverage.average.toFixed(2)}. Esse valor está alto, baixo ou dentro da média?`
        : `O indicador "${definition.label}" de ${ticker} é ${value.toFixed(2)}. Não há dado de comparação setorial disponível na base — diga isso claramente antes de comentar o valor isoladamente, sem estimar uma média.`
    case "COMPARE_SECTOR":
      if (value == null) return null
      return sectorAverage
        ? `Compare o indicador "${definition.label}" de ${ticker} (${value.toFixed(2)}) com a média do setor "${sector}" (${sectorAverage.average.toFixed(2)}, calculada sobre ${sectorAverage.sampleSize} empresas).`
        : `Não há dado de comparação setorial de "${definition.label}" disponível na base para o setor "${sector}". Diga isso claramente em vez de estimar uma média.`
    default:
      return null
  }
}
