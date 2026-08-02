import "server-only"

import type { NewsTopic } from "@/generated/prisma/client"
import { NEWS_TOPIC_LABELS } from "@/features/news/types"
import { formatDate, formatPercent } from "@/utils/format"

/// Structural, not derived from getArticleById's return type — every AI
/// feature that builds facts (Resumir/Sentimento/Explicação para
/// iniciantes/eager per-feed sentiment) needs this, including queries.ts
/// itself (eager sentiment generation runs right where rows are already in
/// hand, no second fetch), so this can't depend on the query layer without
/// creating an import cycle.
export interface NewsFactsArticle {
  title: string
  description: string | null
  content: string | null
  sourceName: string
  publishedAt: Date
  topics: NewsTopic[]
  companyLinks: {
    company: {
      ticker: string
      name: string
      sector: string | null
      stock: {
        priceToEarnings: unknown
        roe: unknown
        dividendYield: unknown
        netMargin: unknown
      } | null
    }
  }[]
}

function formatMaybeDecimal(value: unknown): number | null {
  if (value == null) return null
  return typeof value === "number" ? value : Number(value)
}

/// Builds the fact list every article-level AI feature (Resumir/Sentimento/
/// Explicação para iniciantes) is grounded in — everything comes straight
/// from the already-fetched NewsArticle row (title, description, content,
/// source, matched tickers), never re-derived or estimated. Returns null
/// when the article has essentially no text to work with (some providers
/// omit `content` for a given article).
export function buildNewsFacts(article: NewsFactsArticle): string[] | null {
  const facts: string[] = []
  facts.push(`Título: ${article.title}`)
  if (article.description) facts.push(`Resumo original: ${article.description}`)
  if (article.content) facts.push(`Conteúdo: ${article.content}`)
  facts.push(`Fonte: ${article.sourceName}`)
  facts.push(`Publicado em: ${formatDate(article.publishedAt)}`)
  if (article.topics.length > 0) facts.push(`Categorias: ${article.topics.map((t) => NEWS_TOPIC_LABELS[t]).join(", ")}`)
  if (article.companyLinks.length > 0) {
    facts.push(`Ativos relacionados: ${article.companyLinks.map((link) => `${link.company.ticker} (${link.company.name})`).join(", ")}`)
    for (const link of article.companyLinks) {
      const fundamentalsLine = buildCompanyFundamentalsLine(link.company)
      if (fundamentalsLine) facts.push(fundamentalsLine)
    }
  }

  return facts.length <= 3 && !article.description && !article.content ? null : facts
}

/// One line per linked company, only the fields that actually exist for it
/// — never a fabricated ratio. Lets Resumir/Sentimento/Explicação ground a
/// claim like "a empresa negocia a um P/L elevado" in a real number instead
/// of the article text alone.
function buildCompanyFundamentalsLine(company: NewsFactsArticle["companyLinks"][number]["company"]): string | null {
  const parts: string[] = []
  if (company.sector) parts.push(`setor ${company.sector}`)
  const pl = formatMaybeDecimal(company.stock?.priceToEarnings)
  if (pl != null) parts.push(`P/L ${pl.toFixed(2).replace(".", ",")}`)
  const roe = formatMaybeDecimal(company.stock?.roe)
  if (roe != null) parts.push(`ROE ${formatPercent(roe)}`)
  const dividendYield = formatMaybeDecimal(company.stock?.dividendYield)
  if (dividendYield != null) parts.push(`Dividend Yield ${formatPercent(dividendYield)}`)
  const netMargin = formatMaybeDecimal(company.stock?.netMargin)
  if (netMargin != null) parts.push(`Margem Líquida ${formatPercent(netMargin)}`)

  return parts.length > 0 ? `Fundamentos de ${company.ticker}: ${parts.join(", ")}` : null
}
