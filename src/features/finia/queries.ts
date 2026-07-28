import "server-only"

import { prisma } from "@/lib/prisma"

export interface ConversationSummary {
  id: string
  title: string
  updatedAt: string
  lastMessagePreview: string | null
}

export interface ConversationMessageRow {
  id: string
  role: "USER" | "ASSISTANT"
  content: string
  sources: string[]
  suggestions: string[]
  createdAt: string
}

const CONVERSATIONS_PAGE_SIZE = 20

/// Cursor-paginated (never a full-table fetch) and search-filterable by
/// title — satisfies "Pesquisar conversa" without a separate full-text
/// index (titles are short, `contains` is plenty for this volume).
export async function getConversationsForProfile(
  profileId: string,
  opts?: { search?: string; cursor?: string }
): Promise<{ conversations: ConversationSummary[]; nextCursor: string | null }> {
  const rows = await prisma.conversation.findMany({
    where: {
      profileId,
      ...(opts?.search ? { title: { contains: opts.search, mode: "insensitive" as const } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: CONVERSATIONS_PAGE_SIZE + 1,
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: { messages: { orderBy: { createdAt: "desc" as const }, take: 1 } },
  })

  const hasMore = rows.length > CONVERSATIONS_PAGE_SIZE
  const page = hasMore ? rows.slice(0, CONVERSATIONS_PAGE_SIZE) : rows

  return {
    conversations: page.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt.toISOString(),
      lastMessagePreview: c.messages[0]?.content.slice(0, 80) ?? null,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}

/// Returns [] (never throws, never another user's messages) when the
/// conversation doesn't exist or belongs to someone else.
export async function getConversationMessages(conversationId: string, profileId: string): Promise<ConversationMessageRow[]> {
  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, profileId }, select: { id: true } })
  if (!conversation) return []

  const messages = await prisma.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  })

  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    sources: m.sources,
    suggestions: m.suggestions,
    createdAt: m.createdAt.toISOString(),
  }))
}
