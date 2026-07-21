"use client"

import { Plus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { TradeDialog, type TradeCompany } from "@/features/portfolio/components/TradeDialog"
import { FavoriteButton } from "@/features/company/components/FavoriteButton"
import { ShareButton } from "@/features/company/components/ShareButton"

interface CompanyHeaderActionsProps {
  company: TradeCompany
  initialFavorited: boolean
  isAuthenticated: boolean
}

export function CompanyHeaderActions({ company, initialFavorited, isAuthenticated }: CompanyHeaderActionsProps) {
  const [tradeOpen, setTradeOpen] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={() => setTradeOpen(true)}>
        <Plus className="size-4" />
        Adicionar à Carteira
      </Button>
      <FavoriteButton
        companyId={company.id}
        ticker={company.ticker}
        initialFavorited={initialFavorited}
        isAuthenticated={isAuthenticated}
      />
      <ShareButton ticker={company.ticker} name={company.name} />

      <TradeDialog type="BUY" company={company} open={tradeOpen} onOpenChange={setTradeOpen} />
    </div>
  )
}
