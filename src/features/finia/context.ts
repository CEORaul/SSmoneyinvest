import "server-only"

import { getAlertsForProfile } from "@/features/alerts/queries"
import { getCompanyByTicker } from "@/features/company/queries"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { computePortfolioScore } from "@/features/portfolio/score/compute-score"
import { buildKnownFactsList } from "@/services/ai-content-service"
import { formatCurrencyCents } from "@/utils/format"

export interface PlatformContext {
  /// One formatted text block per real data section — only sections with
  /// actual data are included (an empty carteira never produces a
  /// "Carteira" block full of zeros). Fed straight into
  /// buildFiniaSystemPrompt's "DADOS DISPONÍVEIS" section.
  blocks: string[]
  /// The section labels that actually made it into `blocks` — this becomes
  /// each assistant message's "Baseado em: ..." citation once the model
  /// answers, so a citation can never claim a source that wasn't really
  /// there.
  sourceLabels: string[]
}

/// Everything FinIA is allowed to know about the current user — gathered
/// from the exact same queries every other feature already uses
/// (getPortfolioSummary, computePortfolioScore, getAlertsForProfile), never
/// a second/parallel data path. Nothing here calls BRAPI or any external
/// API; it's all already-synced Postgres data. If a section has no real
/// data, it's omitted entirely rather than padded with zeros or "N/A" —
/// the system prompt tells the model to say "não possuo dados suficientes"
/// for anything not covered here.
export async function buildPlatformContext(profileId: string, currentPath?: string): Promise<PlatformContext> {
  const blocks: string[] = []
  const sourceLabels: string[] = []

  const summary = await getPortfolioSummary(profileId)
  if (summary.positions.length > 0) {
    const t = summary.totals
    const positionLines = summary.positions
      .map(
        (p) =>
          `  - ${p.ticker} (${p.name}): ${formatCurrencyCents(p.currentValueCents)}, ${p.allocationPct.toFixed(1)}% da carteira, rentabilidade ${p.profitPct.toFixed(1)}%`
      )
      .join("\n")

    blocks.push(
      "### Carteira\n" +
        `- Patrimônio atual: ${formatCurrencyCents(t.currentValueCents)}\n` +
        `- Total investido: ${formatCurrencyCents(t.investedCents)}\n` +
        `- Rentabilidade acumulada: ${t.profitPct.toFixed(2)}%\n` +
        `- Dividendos recebidos (total): ${formatCurrencyCents(t.dividendsReceivedCents)}\n` +
        `- Quantidade de ativos: ${t.assetCount}\n` +
        "- Posições:\n" +
        positionLines
    )
    sourceLabels.push("Carteira")

    const scoreResult = computePortfolioScore(summary)
    if (scoreResult) {
      const criteriaLines = scoreResult.criteria
        .map((c) => (c.score != null ? `  - ${c.label}: ${c.score}/${c.weight} — ${c.summary}` : `  - ${c.label}: não aplicável`))
        .join("\n")
      blocks.push(
        "### Score da Carteira\n" +
          `- Score geral: ${scoreResult.score}/100 (${scoreResult.bucket})\n` +
          "- Critérios:\n" +
          criteriaLines
      )
      sourceLabels.push("Score")
    }
  }

  const alerts = await getAlertsForProfile(profileId)
  if (alerts.length > 0) {
    const activeAlerts = alerts.filter((a) => a.status === "ACTIVE")
    const alertLines =
      activeAlerts.length > 0
        ? activeAlerts
            .map((a) => `  - ${a.ticker} ${a.direction === "ABOVE" ? "acima de" : "abaixo de"} ${formatCurrencyCents(a.targetPriceCents)}`)
            .join("\n")
        : "  - nenhum alerta ativo no momento"
    blocks.push(`### Alertas\n- Alertas ativos: ${activeAlerts.length}\n${alertLines}`)
    sourceLabels.push("Alertas")
  }

  if (currentPath) {
    blocks.push(`### Página atual\nO usuário está navegando em: ${currentPath}`)

    // Real BRAPI-sourced fundamentals for whatever company the user is
    // currently looking at — reuses the exact fact-gating ai-content-service
    // already applies to indicator questions and the comparator, so this
    // never duplicates or drifts from those numbers.
    const empresaMatch = currentPath.match(/^\/empresa\/([^/?]+)/)
    if (empresaMatch) {
      const company = await getCompanyByTicker(decodeURIComponent(empresaMatch[1]))
      if (company) {
        const facts = buildKnownFactsList(company)
        if (facts.length > 0) {
          blocks.push(`### Empresa em foco\n${company.ticker} (${company.name})\n${facts.join("\n")}`)
          sourceLabels.push("Empresa em foco")
        }
      }
    }
  }

  return { blocks, sourceLabels }
}
