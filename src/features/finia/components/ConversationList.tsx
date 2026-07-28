"use client"

import { MessageSquarePlus, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { deleteConversationAction, getConversationsAction, renameConversationAction } from "@/features/finia/actions"
import type { ConversationSummary } from "@/features/finia/queries"
import { cn } from "@/lib/utils"

interface ConversationListProps {
  conversations: ConversationSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onConversationsChange: (conversations: ConversationSummary[]) => void
}

/// "Nova conversa / Renomear / Excluir / Pesquisar conversa" — all four CRUD
/// operations the spec asks for, backed by the Server Actions in
/// actions.ts. Search is server-side (getConversationsAction with a
/// `search` param), not a client-side filter, so it stays correct once
/// pagination is involved.
export function ConversationList({ conversations, selectedId, onSelect, onNew, onConversationsChange }: ConversationListProps) {
  const [search, setSearch] = useState("")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSearchChange(value: string) {
    setSearch(value)
    startTransition(async () => {
      const result = await getConversationsAction(value || undefined)
      onConversationsChange(result.conversations)
    })
  }

  async function handleDelete(id: string) {
    const result = await deleteConversationAction(id)
    if (result.ok) {
      onConversationsChange(conversations.filter((c) => c.id !== id))
      if (selectedId === id) onNew()
    }
  }

  async function handleRenameSubmit(id: string) {
    const trimmed = renameValue.trim()
    setRenamingId(null)
    if (trimmed.length === 0) return
    const result = await renameConversationAction(id, trimmed)
    if (result.ok) {
      onConversationsChange(conversations.map((c) => (c.id === id ? { ...c, title: trimmed } : c)))
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-border p-3">
        <Button className="w-full" size="sm" onClick={onNew}>
          <MessageSquarePlus className="size-4" />
          Nova conversa
        </Button>
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Pesquisar conversa..."
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>
      <div className={cn("flex-1 overflow-y-auto transition-opacity", isPending && "opacity-60")}>
        {conversations.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {search ? "Nenhuma conversa encontrada." : "Nenhuma conversa ainda."}
          </p>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "group flex items-center gap-1 border-b border-border px-3 py-2.5 hover:bg-accent/50",
                selectedId === conversation.id && "bg-accent"
              )}
            >
              {renamingId === conversation.id ? (
                <Input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit(conversation.id)
                    if (e.key === "Escape") setRenamingId(null)
                  }}
                  onBlur={() => handleRenameSubmit(conversation.id)}
                  className="h-7 flex-1 text-sm"
                />
              ) : (
                <button type="button" onClick={() => onSelect(conversation.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{conversation.title}</p>
                  {conversation.lastMessagePreview && (
                    <p className="truncate text-xs text-muted-foreground">{conversation.lastMessagePreview}</p>
                  )}
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100" aria-label="Ações da conversa" />
                  }
                >
                  <MoreHorizontal className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setRenamingId(conversation.id)
                      setRenameValue(conversation.title)
                    }}
                  >
                    <Pencil className="size-4" />
                    Renomear
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => handleDelete(conversation.id)}>
                    <Trash2 className="size-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
