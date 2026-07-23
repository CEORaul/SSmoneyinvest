import { Clock } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getUpcomingEventPlaceholders } from "@/features/radar/insights"

/// "Próximos Eventos" — no financial-calendar provider is wired up yet, so
/// every category honestly reports "Aguardando sincronização" instead of a
/// guessed date. The structure (one row per kind) is what a future real
/// sync would fill in without any UI rewrite.
export function UpcomingEventsSection() {
  const placeholders = getUpcomingEventPlaceholders()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximos Eventos</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {placeholders.map((placeholder) => (
          <div
            key={placeholder.kind}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span>{placeholder.label}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {placeholder.status}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
