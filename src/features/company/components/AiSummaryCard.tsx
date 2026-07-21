import { Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CompanyDetailDTO } from "@/features/company/queries"
import { aiContentService } from "@/services/ai-content-service"

interface AiSummaryCardProps {
  dto: CompanyDetailDTO
}

/// Async Server Component — the one genuinely slow, externally-billed part
/// of the page, which is exactly why it's wrapped in a <Suspense> boundary
/// by its caller (CompanySummaryCard) instead of blocking the rest of the
/// page's already-fetched real data. A null result (missing/invalid API
/// key, rate limit, network error — anything) renders a quiet unavailable
/// line, never an error, never fabricated text.
export async function AiSummaryCard({ dto }: AiSummaryCardProps) {
  const summary = await aiContentService.getOrGenerateCompanySummary(dto)

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Resumo Inteligente
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
