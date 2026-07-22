"use client"

import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"
import type { TopMovers } from "@/features/portfolio/insights"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatPercent } from "@/utils/format"

interface TopMoversCardsProps {
  topMovers: TopMovers
  dividendsReceivedThisMonthCents: number
}

/// "Maior alta/queda do dia", "maior posição", "maior lucro/prejuízo" and
/// real dividends-this-month — each card links to the asset's page when
/// there's a position behind it. "Dividendos previstos" has no reliable
/// future-announcement data source yet, so it's an honest "Em breve" stub
/// rather than a fabricated number.
export function TopMoversCards({ topMovers, dividendsReceivedThisMonthCents }: TopMoversCardsProps) {
  const cards: {
    label: string
    ticker?: string
    value: string
    tone?: "gain" | "loss"
    href?: string
  }[] = []

  if (topMovers.biggestGainer) {
    cards.push({
      label: "Maior alta do dia",
      ticker: topMovers.biggestGainer.position.ticker,
      value: formatPercent(topMovers.biggestGainer.value),
      tone: "gain",
      href: `/empresa/${topMovers.biggestGainer.position.ticker}`,
    })
  }
  if (topMovers.biggestLoser) {
    cards.push({
      label: "Maior queda do dia",
      ticker: topMovers.biggestLoser.position.ticker,
      value: formatPercent(topMovers.biggestLoser.value),
      tone: "loss",
      href: `/empresa/${topMovers.biggestLoser.position.ticker}`,
    })
  }
  if (topMovers.largestPosition) {
    cards.push({
      label: "Maior posição",
      ticker: topMovers.largestPosition.position.ticker,
      value: formatCurrencyCents(topMovers.largestPosition.value),
      href: `/empresa/${topMovers.largestPosition.position.ticker}`,
    })
  }
  if (topMovers.biggestProfit) {
    cards.push({
      label: "Maior lucro",
      ticker: topMovers.biggestProfit.position.ticker,
      value: formatCurrencyCents(topMovers.biggestProfit.value),
      tone: "gain",
      href: `/empresa/${topMovers.biggestProfit.position.ticker}`,
    })
  }
  if (topMovers.biggestLoss) {
    cards.push({
      label: "Maior prejuízo",
      ticker: topMovers.biggestLoss.position.ticker,
      value: formatCurrencyCents(topMovers.biggestLoss.value),
      tone: "loss",
      href: `/empresa/${topMovers.biggestLoss.position.ticker}`,
    })
  }
  cards.push({
    label: "Dividendos recebidos no mês",
    value: formatCurrencyCents(dividendsReceivedThisMonthCents),
  })
  cards.push({ label: "Dividendos previstos", value: "Em breve" })

  if (cards.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => {
        const content = (
          <Card className={cn(card.href && "transition-colors hover:bg-accent/40")}>
            <CardContent className="space-y-1">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p
                className={cn(
                  "text-lg font-semibold tabular-nums",
                  card.tone === "gain" && "text-gain",
                  card.tone === "loss" && "text-loss"
                )}
              >
                {card.value}
              </p>
              {card.ticker && <p className="text-xs text-muted-foreground">{card.ticker}</p>}
            </CardContent>
          </Card>
        )
        return card.href ? (
          <Link key={card.label} href={card.href}>
            {content}
          </Link>
        ) : (
          <div key={card.label}>{content}</div>
        )
      })}
    </div>
  )
}
