"use server"

import { revalidatePath } from "next/cache"

import type { ConversationMessageRow, ConversationSummary } from "@/features/finia/queries"
import { getConversationMessages, getConversationsForProfile } from "@/features/finia/queries"
import { AIService } from "@/lib/ai/ai-service"
import { SYSTEM_PERSONA } from "@/lib/ai/prompts/persona"
import { requireUser } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export interface FiniaActionResult {
  ok: boolean
  error?: string
}

function titleFromMessage(message: string): string {
  const trimmed = message.trim()
  if (trimmed.length === 0) return "Nova conversa"
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed
}

export async function createConversationAction(firstMessage?: string): Promise<(FiniaActionResult & { id?: string })> {
  const profile = await requireUser()
  const conversation = await prisma.conversation.create({
    data: { profileId: profile.id, title: firstMessage ? titleFromMessage(firstMessage) : "Nova conversa" },
  })
  revalidatePath("/finia")
  return { ok: true, id: conversation.id }
}

export async function renameConversationAction(id: string, title: string): Promise<FiniaActionResult> {
  const profile = await requireUser()
  const trimmed = title.trim()
  if (trimmed.length === 0) return { ok: false, error: "Informe um nome para a conversa." }

  const result = await prisma.conversation.updateMany({
    where: { id, profileId: profile.id },
    data: { title: trimmed.slice(0, 80) },
  })
  if (result.count === 0) return { ok: false, error: "Conversa não encontrada." }

  revalidatePath("/finia")
  return { ok: true }
}

export async function deleteConversationAction(id: string): Promise<FiniaActionResult> {
  const profile = await requireUser()
  const result = await prisma.conversation.deleteMany({ where: { id, profileId: profile.id } })
  if (result.count === 0) return { ok: false, error: "Conversa não encontrada." }

  revalidatePath("/finia")
  return { ok: true }
}

export async function getConversationsAction(
  search?: string,
  cursor?: string
): Promise<{ conversations: ConversationSummary[]; nextCursor: string | null }> {
  const profile = await requireUser()
  return getConversationsForProfile(profile.id, { search, cursor })
}

export async function getConversationMessagesAction(conversationId: string): Promise<ConversationMessageRow[]> {
  const profile = await requireUser()
  return getConversationMessages(conversationId, profile.id)
}

/// The generic "Explicar com IA" entry point used by ExplainWithAiButton on
/// pages that don't already have their own AI-explain affordance (Empresa,
/// Comparador, Score and Radar all have their own — see that component's
/// doc comment). Fixed question + optional real context facts, never free
/// text from the user; returns null on any failure so the caller can show
/// "indisponível" rather than propagate an error.
export async function explainWithFiniaAction(question: string, contextFacts: string[]): Promise<string | null> {
  await requireUser()
  try {
    const prompt = contextFacts.length > 0 ? `${question}\n\nContexto:\n${contextFacts.join("\n")}` : question
    return await AIService.generateText({ system: SYSTEM_PERSONA, prompt, maxTokens: 300 })
  } catch {
    return null
  }
}
