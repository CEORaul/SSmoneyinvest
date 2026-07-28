"use client"

import { Bot, User } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import type { ConversationMessageRow } from "@/features/finia/queries"
import { cn } from "@/lib/utils"

interface ChatMessageProps {
  message: Pick<ConversationMessageRow, "role" | "content" | "sources" | "suggestions">
  onSuggestionClick?: (suggestion: string) => void
  /// True only for the one assistant message currently streaming in — used
  /// to show a typing caret and hide sources/suggestions until they're real
  /// (both are only known once the stream finishes and the row is saved).
  isStreaming?: boolean
}

/// Markdown/tables via react-markdown+remark-gfm (the spec explicitly asks
/// for Markdown, código and tabelas) — code blocks fall back to the
/// browser's monospace rendering via a plain <pre>/<code>, no syntax
/// highlighter added (would be a much bigger dependency for a feature not
/// explicitly requested beyond "código").
export function ChatMessage({ message, onSuggestionClick, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "USER"

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary"
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>

      <div className={cn("flex max-w-[80%] flex-col gap-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-table:text-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || (isStreaming ? "…" : "")}</ReactMarkdown>
              {isStreaming && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-current align-middle" />}
            </div>
          )}
        </div>

        {!isUser && !isStreaming && message.sources.length > 0 && (
          <p className="px-1 text-xs text-muted-foreground">Baseado em: {message.sources.join(", ")}</p>
        )}

        {!isUser && !isStreaming && message.suggestions.length > 0 && onSuggestionClick && (
          <div className="flex flex-wrap gap-1.5">
            {message.suggestions.map((suggestion) => (
              <Button key={suggestion} variant="outline" size="sm" onClick={() => onSuggestionClick(suggestion)}>
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
