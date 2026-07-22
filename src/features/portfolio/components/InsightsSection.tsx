"use client"

import { Sparkles } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PortfolioInsight } from "@/features/portfolio/insights"

interface InsightsSectionProps {
  insights: PortfolioInsight[]
}

/// Rule-based sentences over already-computed figures (see insights.ts) —
/// deliberately phrased as templates today so a future AI-generated version
/// can slot in later without changing what triggers each insight.
export function InsightsSection({ insights }: InsightsSectionProps) {
  if (insights.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((insight) => {
          const content = (
            <div className="flex items-start gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent/60">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{insight.text}</span>
            </div>
          )
          return insight.href ? (
            <Link key={insight.key} href={insight.href}>
              {content}
            </Link>
          ) : (
            <div key={insight.key}>{content}</div>
          )
        })}
      </CardContent>
    </Card>
  )
}
