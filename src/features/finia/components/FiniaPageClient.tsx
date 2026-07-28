"use client"

import { Bot } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Card } from "@/components/ui/card"
import { CreateAlertDialog } from "@/features/alerts/components/CreateAlertDialog"
import type { FiniaAction, FiniaAlertPrefill } from "@/features/finia/actions-catalog"
import { createConversationAction, getConversationMessagesAction, getConversationsAction } from "@/features/finia/actions"
import { ChatInput } from "@/features/finia/components/ChatInput"
import { ChatMessage } from "@/features/finia/components/ChatMessage"
import { ConversationList } from "@/features/finia/components/ConversationList"
import { PlatformSummaryPanel } from "@/features/finia/components/PlatformSummaryPanel"
import { SuggestedQuestionCards } from "@/features/finia/components/SuggestedQuestionCards"
import type { ConversationMessageRow, ConversationSummary } from "@/features/finia/queries"

interface PlatformSummary {
  patrimonyCents: number
  profitPct: number
  dividendsReceivedCents: number
  assetCount: number
  activeAlertsCount: number
  score: number | null
  scoreBucket: string | null
}

interface FiniaPageClientProps {
  initialConversations: ConversationSummary[]
  summary: PlatformSummary
  greeting: string
}

let localMessageCounter = 0
function nextLocalId(prefix: string): string {
  localMessageCounter += 1
  return `${prefix}-${Date.now()}-${localMessageCounter}`
}

/// The whole FinIA experience: conversation list + dashboard/chat panel.
/// Streaming is consumed manually (fetch + ReadableStream reader), not via
/// a chat SDK — none is installed, and the underlying token stream itself
/// was verified live against the real Gemini API before this was built on
/// top of it. Once a stream finishes, the authoritative persisted message
/// (with its real sources/suggestions, only known after the DB write) is
/// re-fetched — the client never invents those two fields itself.
export function FiniaPageClient({ initialConversations, summary, greeting }: FiniaPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [conversations, setConversations] = useState(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessageRow[]>([])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [alertPrefill, setAlertPrefill] = useState<FiniaAlertPrefill | null>(null)
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    })
  }

  async function handleSelectConversation(id: string) {
    setSelectedId(id)
    const msgs = await getConversationMessagesAction(id)
    setMessages(msgs)
    scrollToBottom()
  }

  function handleNewConversation() {
    setSelectedId(null)
    setMessages([])
    setInput("")
  }

  function handleAction(action: FiniaAction) {
    if (action.type === "NAVIGATE") {
      router.push(action.href)
      return
    }
    if (action.type === "PREFILL_ALERT" && action.prefill) {
      setAlertPrefill(action.prefill)
      setAlertDialogOpen(true)
    }
  }

  async function handleSend(overrideMessage?: string) {
    const message = (overrideMessage ?? input).trim()
    if (!message || isSending) return

    setInput("")
    setIsSending(true)

    let conversationId = selectedId
    if (!conversationId) {
      const result = await createConversationAction(message)
      if (!result.ok || !result.id) {
        toast.error("Não foi possível iniciar a conversa.")
        setIsSending(false)
        return
      }
      conversationId = result.id
      setSelectedId(conversationId)
    }

    const userMessage: ConversationMessageRow = {
      id: nextLocalId("user"),
      role: "USER",
      content: message,
      sources: [],
      suggestions: [],
      createdAt: new Date().toISOString(),
    }
    const placeholderId = nextLocalId("assistant")
    const placeholder: ConversationMessageRow = {
      id: placeholderId,
      role: "ASSISTANT",
      content: "",
      sources: [],
      suggestions: [],
      createdAt: new Date().toISOString(),
    }
    setMessages((current) => [...current, userMessage, placeholder])
    setStreamingMessageId(placeholderId)
    scrollToBottom()

    try {
      const response = await fetch("/api/finia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message, currentPath: pathname }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        toast.error(data?.error ?? "Não foi possível falar com a SS AI agora.")
        setMessages((current) => current.filter((m) => m.id !== placeholderId))
        setStreamingMessageId(null)
        return
      }

      const contentType = response.headers.get("content-type") ?? ""
      if (contentType.includes("application/json")) {
        const data = (await response.json()) as { text: string; action: FiniaAction }
        setMessages((current) => current.map((m) => (m.id === placeholderId ? { ...m, content: data.text } : m)))
        setStreamingMessageId(null)
        handleAction(data.action)
      } else if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ""
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          setMessages((current) => current.map((m) => (m.id === placeholderId ? { ...m, content: accumulated } : m)))
          scrollToBottom()
        }
        setStreamingMessageId(null)
        // The real sources/suggestions only exist once the server persisted
        // the finished message — refetch rather than guessing them client-side.
        const persisted = await getConversationMessagesAction(conversationId)
        setMessages(persisted)
      }

      const refreshed = await getConversationsAction()
      setConversations(refreshed.conversations)
    } catch {
      toast.error("Não foi possível falar com a SS AI agora.")
      setMessages((current) => current.filter((m) => m.id !== placeholderId))
      setStreamingMessageId(null)
    } finally {
      setIsSending(false)
      scrollToBottom()
    }
  }

  const showDashboard = !selectedId && messages.length === 0

  return (
    <div className="grid h-[calc(100vh-9rem)] min-h-[32rem] grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
      <Card className="hidden overflow-hidden py-0 md:block">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onConversationsChange={setConversations}
        />
      </Card>

      <Card className="flex flex-col overflow-hidden py-0">
        {showDashboard ? (
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bot className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{greeting}</h2>
                <p className="text-sm text-muted-foreground">Bem-vindo à SS AI.</p>
              </div>
            </div>

            <PlatformSummaryPanel {...summary} />

            <div className="space-y-2">
              <p className="text-sm font-medium">Experimente perguntar:</p>
              <SuggestedQuestionCards onSelect={(q) => handleSend(q)} />
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={message.id === streamingMessageId}
                onSuggestionClick={(s) => handleSend(s)}
              />
            ))}
          </div>
        )}

        <ChatInput value={input} onChange={setInput} onSend={() => handleSend()} disabled={isSending} />
      </Card>

      <CreateAlertDialog
        open={alertDialogOpen}
        onOpenChange={setAlertDialogOpen}
        onSaved={() => setAlertDialogOpen(false)}
        initialPrefill={
          alertPrefill
            ? {
                id: alertPrefill.companyId,
                ticker: alertPrefill.ticker,
                name: alertPrefill.name,
                logoUrl: alertPrefill.logoUrl,
                priceCents: alertPrefill.priceCents,
                assetClass: alertPrefill.assetClass,
                priceSource: alertPrefill.priceSource,
                direction: alertPrefill.direction,
                targetPriceCents: alertPrefill.targetPriceCents,
              }
            : undefined
        }
      />
    </div>
  )
}
