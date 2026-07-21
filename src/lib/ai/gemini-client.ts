import "server-only"

import { GoogleGenAI } from "@google/genai"

export const AI_MODEL = "gemini-flash-lite-latest"

let client: GoogleGenAI | null = null

/// Lazily constructed so a missing/invalid GEMINI_API_KEY never crashes
/// module load (import graphs in Next.js get evaluated eagerly in places) —
/// the failure only surfaces when something actually tries to generate
/// text, and src/services/ai-content-service.ts is the only thing that does.
function getGeminiClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
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
  const response = await getGeminiClient().models.generateContent({
    model: AI_MODEL,
    contents: prompt,
    config: { systemInstruction: system, maxOutputTokens: maxTokens },
  })

  const text = response.text
  if (!text) {
    throw new Error("Resposta da IA não continha texto")
  }
  return text.trim()
}
