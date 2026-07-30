import { Sparkles } from "lucide-react"

import { PriceChangeTag } from "@/components/shared/PriceChangeTag"
import type { NewsPerformanceSnapshot, NewsRelevance } from "@/features/news/types"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatPercent } from "@/utils/format"

interface NewsRelevancePanelProps {
  relevance: NewsRelevance | null
}

/// Position weight above which "pode impactar uma parte relevante do seu
/// patrimônio" is honest to say — below this, the position exists but
/// calling it "relevante" would overstate a small allocation.
const RELEVANT_ALLOCATION_THRESHOLD_PCT = 5

function buildRelevanceMessages(relevance: NewsRelevance): string[] {
  const { company, reason, position } = relevance

  if (reason === "owned" && position) {
    const messages = [
      `Você possui ${position.quantity} ${company.ticker}.`,
      `A ${company.ticker} representa ${formatPercent(position.allocationPct)} da sua carteira.`,
    ]
    if (position.allocationPct >= RELEVANT_ALLOCATION_THRESHOLD_PCT) {
      messages.push("Esta notícia pode impactar uma parte relevante do seu patrimônio.")
    }
    return messages
  }

  if (reason === "alerted") {
    return [
      `Você tem um alerta configurado para ${company.ticker}. Caso continue interessante, poderá adicioná-lo à carteira futuramente.`,
    ]
  }

  return [
    `Você acompanha ${company.ticker} nos seus favoritos. Caso continue interessante, poderá adicioná-lo à carteira futuramente.`,
  ]
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-xs font-semibold tabular-nums",
          tone === "gain" && "text-gain",
          tone === "loss" && "text-loss"
        )}
      >
        {value}
      </span>
    </div>
  )
}

function PerformanceRow({ performance }: { performance: NewsPerformanceSnapshot }) {
  const entries: [string, number | null][] = [
    ["Hoje", performance.todayPct],
    ["7 dias", performance.sevenDayPct],
    ["30 dias", performance.thirtyDayPct],
    ["52 semanas", performance.fiftyTwoWeekPct],
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {entries.map(([label, pct]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          {pct === null ? <span className="text-xs text-muted-foreground">—</span> : <PriceChangeTag changePct={pct} className="text-xs" />}
        </div>
      ))}
    </div>
  )
}

/// The deterministic (never-AI) "por que esta notícia importa para mim"
/// card — every fact here comes straight from queries.ts's already-computed
/// relevance (position/performance), so nothing here can hallucinate a
/// quantity or a percentage.
export function NewsRelevancePanel({ relevance }: NewsRelevancePanelProps) {
  if (!relevance) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        Esta notícia não possui relação direta com os seus investimentos atuais.
      </div>
    )
  }

  const messages = buildRelevanceMessages(relevance)

  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
      <div className="flex items-start gap-1.5">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-foreground">Por que esta notícia importa para mim?</p>
          {messages.map((message) => (
            <p key={message} className="text-xs text-muted-foreground">
              {message}
            </p>
          ))}
        </div>
      </div>

      {relevance.position && (
        <div className="space-y-1.5 border-t border-primary/10 pt-2">
          <p className="text-[11px] font-medium text-muted-foreground">Sua posição</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Quantidade" value={relevance.position.quantity} />
            <Stat label="Preço Médio" value={formatCurrencyCents(relevance.position.averagePriceCents)} />
            <Stat label="Preço Atual" value={formatCurrencyCents(relevance.position.currentPriceCents)} />
            <Stat label="Peso na Carteira" value={formatPercent(relevance.position.allocationPct)} />
          </div>
        </div>
      )}

      <div className="space-y-1.5 border-t border-primary/10 pt-2">
        <p className="text-[11px] font-medium text-muted-foreground">Desempenho do ativo ({relevance.company.ticker})</p>
        <PerformanceRow performance={relevance.performance} />
      </div>
    </div>
  )
}
