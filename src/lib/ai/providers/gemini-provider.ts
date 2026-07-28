import "server-only"

import { generateChatStream, generateText } from "@/lib/ai/gemini-client"
import type { AiProvider } from "@/lib/ai/providers/types"

export const geminiProvider: AiProvider = {
  name: "gemini",
  generateText,
  generateChatStream,
}
