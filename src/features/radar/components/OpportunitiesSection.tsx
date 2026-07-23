import { Target } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RadarOpportunity } from "@/features/radar/types"

interface OpportunitiesSectionProps {
  opportunities: RadarOpportunity[]
}

/// "Oportunidades" — purely factual (52-week-range proximity), never a
/// buy/sell recommendation (spec point 9 is explicit about this). "Em
/// breve" when there's nothing to report rather than an empty card, since
/// most companies only get 52-week range data once they've had a detail
/// sync (see radar/queries.ts).
export function OpportunitiesSection({ opportunities }: OpportunitiesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Oportunidades</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {opportunities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Em breve.</p>
        ) : (
          opportunities.map((opportunity) => (
            <Link
              key={opportunity.key}
              href={opportunity.href}
              className="flex items-start gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent/60"
            >
              <Target className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{opportunity.text}</span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
