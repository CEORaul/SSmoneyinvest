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

export interface ChatTurn {
  role: "user" | "model"
  text: string
}

export interface GenerateChatStreamInput {
  system: string
  /// Real prior turns of the conversation, oldest first — passed as
  /// Gemini's own multi-turn `contents` array (not concatenated into the
  /// prompt string), so pronoun/reference resolution ("qual das duas?")
  /// is the model's own job, not string-matching in this app. Verified
  /// live against the real API before this was wired into FinIA.
  history: ChatTurn[]
  message: string
  maxTokens?: number
}

/// FinIA's chat entry point — real token streaming via the SDK's
/// generateContentStream, confirmed live (not assumed) to actually yield
/// incremental chunks before this was built on top of it. Throws on any
/// failure exactly like generateText; the caller (the /api/finia/chat route)
/// is responsible for turning a thrown error into a graceful message.
export async function* generateChatStream({
  system,
  history,
  message,
  maxTokens = 800,
}: GenerateChatStreamInput): AsyncGenerator<string> {
  const contents = [
    ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: "user" as const, parts: [{ text: message }] },
  ]

  const stream = await getGeminiClient().models.generateContentStream({
    model: AI_MODEL,
    contents,
    config: { systemInstruction: system, maxOutputTokens: maxTokens },
  })

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text
  }
}
