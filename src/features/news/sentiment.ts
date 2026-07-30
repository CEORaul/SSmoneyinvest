import "server-only"

import { buildNewsFacts } from "@/features/news/facts"
import { getArticleById } from "@/features/news/queries"
import type { NewsSentimentLabel } from "@/features/news/types"
import { aiContentService } from "@/services/ai-content-service"

export interface NewsSentimentResult {
  sentiment: NewsSentimentLabel
  reasons: string[]
  summary: string
  generatedAt: Date
}

const VALID_SENTIMENTS: NewsSentimentLabel[] = ["POSITIVE", "NEUTRAL", "NEGATIVE"]

/// Gemini is instructed to return raw JSON, but models occasionally wrap it
/// in a ```json fence anyway despite instructions not to — stripped before
/// parsing. Any shape mismatch (missing field, wrong type, invalid
/// sentiment value, too many reasons) returns null rather than guessing or
/// coercing: a malformed AI response must never silently become a
/// fabricated badge.
function parseSentimentJson(raw: string): { sentiment: NewsSentimentLabel; reasons: string[]; summary: string } | null {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return null
  }

  if (typeof parsed !== "object" || parsed === null) return null
  const obj = parsed as Record<string, unknown>

  const sentiment = obj.sentiment
  if (typeof sentiment !== "string" || !VALID_SENTIMENTS.includes(sentiment as NewsSentimentLabel)) return null

  const reasonsRaw = obj.reasons
  if (!Array.isArray(reasonsRaw) || !reasonsRaw.every((r) => typeof r === "string")) return null
  const reasons = (reasonsRaw as string[]).slice(0, 3).filter((r) => r.trim().length > 0)

  const summary = obj.summary
  if (typeof summary !== "string" || summary.trim().length === 0) return null

  return { sentiment: sentiment as NewsSentimentLabel, reasons, summary: summary.trim() }
}

/// Split out so callers that already have the article's facts in hand (the
/// eager per-feed-page pass in queries.ts, which already fetched every row)
/// can skip a redundant getArticleById round trip per article.
export async function getNewsSentimentFromFacts(
  articleId: string,
  facts: string[]
): Promise<NewsSentimentResult | null> {
  const result = await aiContentService.getOrGenerateNewsSentiment(articleId, facts)
  if (!result) return null

  const parsed = parseSentimentJson(result.text)
  if (!parsed) return null

  return { ...parsed, generatedAt: result.generatedAt }
}

export async function getNewsSentiment(articleId: string): Promise<NewsSentimentResult | null> {
  const article = await getArticleById(articleId)
  if (!article) return null

  const facts = buildNewsFacts(article)
  if (!facts) return null

  return getNewsSentimentFromFacts(articleId, facts)
}
