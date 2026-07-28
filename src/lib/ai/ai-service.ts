import "server-only"

import { geminiProvider } from "@/lib/ai/providers/gemini-provider"
import type { AiProvider, GenerateChatInput, GenerateTextInput } from "@/lib/ai/providers/types"

/// Every provider this app knows how to talk to. Adding OpenAI/Claude/
/// DeepSeek later means implementing AiProvider once (see
/// providers/gemini-provider.ts for the shape) and adding one line here —
/// never a change to ai-content-service.ts, FinIA, or any other caller.
const PROVIDERS: Record<string, AiProvider> = {
  gemini: geminiProvider,
}

const DEFAULT_PROVIDER = "gemini"

function getActiveProvider(): AiProvider {
  const name = process.env.AI_PROVIDER || DEFAULT_PROVIDER
  return PROVIDERS[name] ?? PROVIDERS[DEFAULT_PROVIDER]
}

/// The ONLY code allowed to call an AI provider SDK directly — every AI
/// feature in the app (ai-content-service.ts's cached explanations, FinIA's
/// chat) goes through this, never straight to @google/genai or any future
/// provider's SDK. Mirrors MarketDataService's exclusivity over BRAPI/Yahoo
/// and AlertService's exclusivity over alert-checking — same pattern,
/// applied to the AI layer.
export const AIService = {
  generateText(input: GenerateTextInput): Promise<string> {
    return getActiveProvider().generateText(input)
  },
  generateChatStream(input: GenerateChatInput): AsyncGenerator<string> {
    return getActiveProvider().generateChatStream(input)
  },
  get activeProviderName(): string {
    return getActiveProvider().name
  },
}
