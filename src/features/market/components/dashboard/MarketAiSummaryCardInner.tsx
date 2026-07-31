import { Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getMarketSummary } from "@/features/market/market-summary"

/// Async Server Component — mirrors company/components/AiSummaryCard.tsx's
/// exact shape (wrapped in <Suspense> by its caller, MarketAiSummaryCard,
/// so a slow/failed generation never blocks the rest of the page). Never a
/// buy/sell recommendation — see market-summary.ts's own prompt.
export async function MarketAiSummaryCardInner() {
  const summary = await getMarketSummary()

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Resumo do Mercado Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summary ? (
          <p className="text-sm leading-relaxed">{summary.text}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Resumo indisponível no momento.</p>
        )}
      </CardContent>
    </Card>
  )
}
