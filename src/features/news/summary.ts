import "server-only"

import { getArticleById } from "@/features/news/queries"
import { NEWS_TOPIC_LABELS } from "@/features/news/types"
import { aiContentService } from "@/services/ai-content-service"
import { formatDate } from "@/utils/format"

/// Builds the fact list "✨ Resumir notícia" is grounded in — everything
/// comes straight from the already-fetched NewsArticle row (title,
/// description, content, source, matched tickers), never re-derived or
/// estimated. Returns null when the article has essentially no text to
/// summarize (some providers omit `content` for a given article).
function buildNewsFacts(article: NonNullable<Awaited<ReturnType<typeof getArticleById>>>): string[] | null {
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

export async function getNewsSummary(articleId: string): Promise<{ text: string; generatedAt: Date } | null> {
  const article = await getArticleById(articleId)
  if (!article) return null

  const facts = buildNewsFacts(article)
  if (!facts) return null

  return aiContentService.getOrGenerateNewsSummary(articleId, facts)
}
