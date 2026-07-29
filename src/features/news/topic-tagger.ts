import "server-only"

import type { NewsTopic } from "@/generated/prisma/client"

/// Deterministic keyword tagging — every /noticias filter chip
/// (Dividendos/Resultados/Aquisições/Fusões/Economia/Política/Tecnologia/
/// IA/Cripto) maps to one of these patterns. Heuristic by design: a
/// tag means "this pattern matched the title/description," never a claim
/// about what the article is actually about — same honesty convention as
/// company-matcher.ts.
const TOPIC_KEYWORDS: Record<NewsTopic, RegExp> = {
  DIVIDENDS: /dividendo|proventos|jcp|juros sobre capital/i,
  EARNINGS: /resultado trimestral|balanco|lucro liquido|receita liquida|earnings/i,
  ACQUISITIONS: /aquisic|acquisition/i,
  MERGERS: /fusao|merger/i,
  ECONOMY: /economia|\bpib\b|inflac|selic|copom|juros|ipca/i,
  POLITICS: /governo|congresso|eleic|politica|regulac/i,
  TECHNOLOGY: /tecnologia|technology|software|semicondutor|\bchip\b/i,
  AI: /inteligencia artificial|\bia\b|artificial intelligence|\bai\b/i,
  CRYPTO: /bitcoin|ethereum|criptomoeda|cryptocurrency|blockchain|altcoin/i,
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

export function tagTopics(text: string): NewsTopic[] {
  const haystack = normalize(text)
  const topics: NewsTopic[] = []

  for (const [topic, pattern] of Object.entries(TOPIC_KEYWORDS) as [NewsTopic, RegExp][]) {
    if (pattern.test(haystack)) topics.push(topic)
  }

  return topics
}
