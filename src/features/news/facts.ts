import "server-only"

import type { NewsTopic } from "@/generated/prisma/client"
import { NEWS_TOPIC_LABELS } from "@/features/news/types"
import { formatDate } from "@/utils/format"

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
  companyLinks: { company: { ticker: string; name: string } }[]
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
  }

  return facts.length <= 3 && !article.description && !article.content ? null : facts
}
