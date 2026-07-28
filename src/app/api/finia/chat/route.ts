import { NextRequest, NextResponse } from "next/server"

import { buildPlatformContext } from "@/features/finia/context"
import { matchFiniaIntent } from "@/features/finia/intent-matcher"
import { deriveFollowUpSuggestions } from "@/features/finia/suggestions"
import { AIService } from "@/lib/ai/ai-service"
import { buildFiniaSystemPrompt } from "@/lib/ai/prompts/finia-assistant"
import { getOptionalProfile } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export const maxDuration = 30

interface ChatRequestBody {
  conversationId: string
  message: string
  currentPath?: string
}

const HISTORY_TURNS = 20

/// A Route Handler, not a Server Action — Server Actions can't return a
/// streamed response, and real token streaming (verified live against the
/// actual Gemini API before this was built) is the whole point of this
/// endpoint. Every other FinIA operation (create/rename/delete/list
/// conversations) stays a normal Server Action in actions.ts; only the
/// actual model call needs this shape.
export async function POST(request: NextRequest) {
  const profile = await getOptionalProfile()
  if (!profile) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const body = (await request.json()) as ChatRequestBody
  const message = body.message?.trim()
  if (!message) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 })
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: body.conversationId, profileId: profile.id },
    select: { id: true },
  })
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 })
  }

  await prisma.conversationMessage.create({
    data: { conversationId: conversation.id, role: "USER", content: message },
  })

  // Deterministic action check runs BEFORE any model call — never asks the
  // model to "decide" a navigation/alert intent, so it can never hallucinate
  // a ticker or a price for something the regex either matches for real or
  // doesn't. See intent-matcher.ts's doc comment for the full rationale.
  const action = await matchFiniaIntent(message)
  if (action) {
    const actionText = `Encontrei o que você pediu — abrindo **${action.label}**.`
    await prisma.conversationMessage.create({
      data: { conversationId: conversation.id, role: "ASSISTANT", content: actionText, sources: [], suggestions: [] },
    })
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } })
    return NextResponse.json({ type: "action", text: actionText, action })
  }

  // Real multi-turn memory: the last N turns of THIS conversation, passed
  // in Gemini's own {role, text} shape (not string-concatenated into the
  // prompt) — pronoun/reference resolution ("qual das duas?") is the
  // model's own job. Confirmed live against the real API before this was
  // wired in.
  const priorMessages = await prisma.conversationMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS + 1,
  })
  const history = priorMessages
    .slice(1) // the first row here is the user message just saved above — passed separately as `message`
    .reverse()
    .map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("model" as const), text: m.content }))

  const { blocks, sourceLabels } = await buildPlatformContext(profile.id, body.currentPath)
  const system = buildFiniaSystemPrompt(blocks)

  const encoder = new TextEncoder()
  let fullText = ""

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of AIService.generateChatStream({ system, history, message, maxTokens: 800 })) {
          fullText += chunk
          controller.enqueue(encoder.encode(chunk))
        }
      } catch {
        const fallback = "Desculpe, não consegui gerar uma resposta agora. Tente novamente em instantes."
        fullText += fallback
        controller.enqueue(encoder.encode(fallback))
      } finally {
        const suggestions = deriveFollowUpSuggestions(message, fullText)
        await prisma.conversationMessage.create({
          data: {
            conversationId: conversation.id,
            role: "ASSISTANT",
            content: fullText,
            sources: sourceLabels,
            suggestions,
          },
        })
        await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } })
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
}
