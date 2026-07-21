import "server-only"

import Anthropic from "@anthropic-ai/sdk"

export const AI_MODEL = "claude-sonnet-5"

let client: Anthropic | null = null

/// Lazily constructed so a missing/invalid ANTHROPIC_API_KEY never crashes
/// module load (import graphs in Next.js get evaluated eagerly in places) —
/// the failure only surfaces when something actually tries to generate
/// text, and src/services/ai-content-service.ts is the only thing that does.
function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

export interface GenerateTextInput {
  system: string
  prompt: string
  maxTokens?: number
}

/// Thin wrapper — no caching, no fallback logic here (that's
/// ai-content-service.ts's job). Throws on any failure (missing key,
/// invalid key, rate limit, network error); every caller must catch.
export async function generateText({ system, prompt, maxTokens = 400 }: GenerateTextInput): Promise<string> {
  const response = await getAnthropicClient().messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  })

  const textBlock = response.content.find((block) => block.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Resposta da IA não continha texto")
  }
  return textBlock.text.trim()
}
