import "server-only"

import { getArticleById } from "@/features/news/queries"
import { buildNewsFacts } from "@/features/news/facts"
import { aiContentService } from "@/services/ai-content-service"

export async function getBeginnerExplanation(articleId: string): Promise<{ text: string; generatedAt: Date } | null> {
  const article = await getArticleById(articleId)
  if (!article) return null

  const facts = buildNewsFacts(article)
  if (!facts) return null

  return aiContentService.getOrGenerateBeginnerExplanation(articleId, facts)
}
