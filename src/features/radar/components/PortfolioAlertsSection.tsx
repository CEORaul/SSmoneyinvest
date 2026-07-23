import { AlertTriangle, Info } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RadarAlert } from "@/features/radar/types"
import { cn } from "@/lib/utils"

interface PortfolioAlertsSectionProps {
  alerts: RadarAlert[]
}

/// "Alertas da Carteira" — every alert here is computed automatically off
/// PortfolioService-maintained data (see radar/insights.ts's
/// computePortfolioAlerts), never hardcoded. Renders nothing when there's
/// nothing to flag, rather than an empty "no alerts" card.
export function PortfolioAlertsSection({ alerts }: PortfolioAlertsSectionProps) {
  if (alerts.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas da Carteira</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => {
          const Icon = alert.tone === "warning" ? AlertTriangle : Info
          const content = (
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm",
                alert.tone === "warning"
                  ? "border-loss/20 bg-loss/5 text-loss"
                  : "border-border bg-muted/40 text-foreground"
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <span>{alert.text}</span>
            </div>
          )
          return alert.href ? (
            <Link key={alert.key} href={alert.href} className="block transition-opacity hover:opacity-80">
              {content}
            </Link>
          ) : (
            <div key={alert.key}>{content}</div>
          )
        })}
      </CardContent>
    </Card>
  )
}
