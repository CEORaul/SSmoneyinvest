import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/// "Radar de Resultados" — no earnings-calendar provider is wired up yet
/// (BRAPI's free tier doesn't expose one), so both columns honestly report
/// "Aguardando integração." The two-column structure (divulgados / a
/// divulgar) is what a future real sync would populate without a rewrite.
export function EarningsRadarSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Radar de Resultados</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Empresas que divulgaram</p>
          <p className="text-sm text-muted-foreground">Aguardando integração.</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Empresas que divulgarão</p>
          <p className="text-sm text-muted-foreground">Aguardando integração.</p>
        </div>
      </CardContent>
    </Card>
  )
}
