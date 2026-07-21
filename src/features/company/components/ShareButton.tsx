"use client"

import { Share2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

interface ShareButtonProps {
  ticker: string
  name: string
}

export function ShareButton({ ticker, name }: ShareButtonProps) {
  async function handleClick() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: `${ticker} — ${name}`, url })
      } catch {
        // User cancelled the native share sheet — not an error worth surfacing.
      }
      return
    }
    await navigator.clipboard.writeText(url)
    toast.success("Link copiado")
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <Share2 className="size-4" />
      Compartilhar
    </Button>
  )
}
