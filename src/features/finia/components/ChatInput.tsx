"use client"

import { Send } from "lucide-react"
import { useRef } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (value.trim() && !disabled) onSend()
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-border bg-card p-3">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Pergunte algo sobre sua carteira, um ativo, ou peça para navegar..."
        className="max-h-40 min-h-10 flex-1 resize-none"
        disabled={disabled}
      />
      <Button size="icon" onClick={onSend} disabled={disabled || !value.trim()} aria-label="Enviar">
        <Send className="size-4" />
      </Button>
    </div>
  )
}
