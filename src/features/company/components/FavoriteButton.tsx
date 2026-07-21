"use client"

import { Heart } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { toggleFavoriteAction } from "@/features/company/actions"
import { cn } from "@/lib/utils"

interface FavoriteButtonProps {
  companyId: string
  ticker: string
  initialFavorited: boolean
  isAuthenticated: boolean
}

export function FavoriteButton({ companyId, ticker, initialFavorited, isAuthenticated }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, setIsPending] = useState(false)

  async function handleClick() {
    if (!isAuthenticated) {
      toast.info("Entre na sua conta para favoritar ativos.")
      return
    }
    setIsPending(true)
    const result = await toggleFavoriteAction(companyId, ticker)
    setIsPending(false)
    if (result.ok) {
      setFavorited(result.favorited ?? !favorited)
    } else {
      toast.error(result.error ?? "Não foi possível atualizar os favoritos.")
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      <Heart className={cn("size-4", favorited && "fill-destructive text-destructive")} />
      {favorited ? "Favoritado" : "Favoritar"}
    </Button>
  )
}
