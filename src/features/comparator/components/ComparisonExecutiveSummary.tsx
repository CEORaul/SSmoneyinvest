import { Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CompanyDetailDTO } from "@/features/company/queries"
import { aiContentService } from "@/services/ai-content-service"

interface ComparisonExecutiveSummaryProps {
  companies: CompanyDetailDTO[]
}

/// Async Server Component — mirrors AiSummaryCard's shape exactly (same
/// "slow, externally-billed, wrapped in Suspense by the caller" reasoning).
/// Takes the already-resolved companies (dividend-yield override already
/// applied by the page) directly rather than re-fetching by ticker, since
/// it renders inline during the initial page load and the page already has
/// everything it needs — no duplicated query.
export async function ComparisonExecutiveSummary({ companies }: ComparisonExecutiveSummaryProps) {
  const summary = await aiContentService.getOrGenerateComparisonSummary(companies)

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Resumo Executivo
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
