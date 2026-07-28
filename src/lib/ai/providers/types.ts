export interface ChatTurn {
  role: "user" | "model"
  text: string
}

export interface GenerateTextInput {
  system: string
  prompt: string
  maxTokens?: number
}

export interface GenerateChatInput {
  system: string
  history: ChatTurn[]
  message: string
  maxTokens?: number
}

/// The contract every AI provider must satisfy — Gemini today
/// (gemini-provider.ts), OpenAI/Claude/DeepSeek later. A new provider is
/// one new file implementing this interface plus one line in
/// ai-service.ts's registry; nothing that calls AIService ever changes.
export interface AiProvider {
  name: string
  generateText(input: GenerateTextInput): Promise<string>
  generateChatStream(input: GenerateChatInput): AsyncGenerator<string>
}
