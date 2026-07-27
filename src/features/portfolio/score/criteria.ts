import type { PortfolioPositionRow, PortfolioSummary } from "@/features/portfolio/queries"
import type { CriterionResult } from "@/features/portfolio/score/types"

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function pct(value: number): string {
  return value.toFixed(1).replace(".", ",") + "%"
}

/// A single scoring criterion — `weight` is its maximum contribution to the
/// 0-100 total, and `compute` returns 0..weight (or null when inapplicable).
/// Adding a future criterion (volatilidade, beta, sharpe, dividendos, ESG,
/// ...) means appending one more entry here with its own weight and compute
/// function — nothing else in the score engine needs to change, since
/// compute-score.ts just sums whatever this array contains.
export interface ScoreCriterionDefinition {
  key: string
  label: string
  weight: number
  compute: (summary: PortfolioSummary) => Omit<CriterionResult, "key" | "label" | "weight">
}

function distinctAssetClasses(positions: PortfolioPositionRow[]): Set<string> {
  return new Set(positions.map((p) => p.assetClass))
}

export const SCORE_CRITERIA: ScoreCriterionDefinition[] = [
  {
    key: "diversificacao",
    label: "Diversificação",
    weight: 20,
    // Rewards the number of distinct asset classes held (Ações, FIIs, ETFs,
    // BDRs, Cripto, Renda Fixa, Outros) — breadth of exposure, not balance
    // (balance is "Distribuição por classes", a separate criterion below).
    compute: (summary) => {
      const classes = distinctAssetClasses(summary.positions)
      const score = Math.min(20, classes.size * 5)
      return {
        score,
        summary:
          classes.size === 1
            ? "Sua carteira possui apenas 1 classe de ativos."
            : `Sua carteira possui ${classes.size} classes de ativos diferentes.`,
        explanation: {
          whatItMeans: "Mede em quantas classes diferentes (Ações, FIIs, ETFs, BDRs, Cripto, Renda Fixa, Outros) seu patrimônio está distribuído.",
          howItsCalculated: "5 pontos por classe distinta detectada na carteira, até o máximo de 20 pontos (4 ou mais classes).",
          whyItMatters: "Concentrar tudo em uma única classe de ativo deixa a carteira mais exposta aos riscos específicos daquela classe.",
        },
      }
    },
  },
  {
    key: "concentracao",
    label: "Concentração",
    weight: 20,
    // Penalizes a single position dominating the portfolio. Full score at
    // <=10% in the largest position, zero at >=50%, linear in between.
    compute: (summary) => {
      if (summary.positions.length === 0) {
        return { score: null, summary: "Sem posições para avaliar.", explanation: CONCENTRATION_EXPLANATION }
      }
      const largest = summary.positions.reduce((a, b) => (b.allocationPct > a.allocationPct ? b : a))
      const score = Math.round(20 * clamp((50 - largest.allocationPct) / 40, 0, 1))
      return {
        score,
        summary:
          largest.allocationPct >= 30
            ? `Você possui concentração elevada em ${largest.ticker} (${pct(largest.allocationPct)} da carteira).`
            : `Sua maior posição é ${largest.ticker}, com ${pct(largest.allocationPct)} da carteira.`,
        explanation: CONCENTRATION_EXPLANATION,
      }
    },
  },
  {
    key: "setores",
    label: "Setores",
    weight: 20,
    // Only meaningful for positions with a known sector (Ações/BDRs) — FIIs,
    // ETFs, Cripto and manual entries have no sector, so they're excluded
    // from this specific calculation rather than counted as one giant
    // "sem setor" sector, which would unfairly penalize normal FII/ETF
    // holdings. Returns null (not a low score) when no position has a
    // known sector at all.
    compute: (summary) => {
      const withSector = summary.positions.filter((p) => p.sector != null && p.currentValueCents > 0)
      const totalWithSector = withSector.reduce((sum, p) => sum + p.currentValueCents, 0)
      if (withSector.length === 0 || totalWithSector === 0) {
        return {
          score: null,
          summary: "Nenhuma posição com setor conhecido na carteira (comum quando a carteira é só FIIs/ETFs/Cripto).",
          explanation: SECTOR_EXPLANATION,
        }
      }
      const bySector = new Map<string, number>()
      for (const p of withSector) bySector.set(p.sector!, (bySector.get(p.sector!) ?? 0) + p.currentValueCents)
      const largestSectorCents = Math.max(...bySector.values())
      const largestSectorPct = (largestSectorCents / totalWithSector) * 100
      const score = Math.round(20 * clamp((60 - largestSectorPct) / 45, 0, 1))
      return {
        score,
        summary:
          largestSectorPct >= 40
            ? `Concentração elevada no setor ${[...bySector.entries()].sort((a, b) => b[1] - a[1])[0][0]} (${pct(largestSectorPct)} das posições com setor conhecido).`
            : `Boa distribuição entre setores (maior setor: ${pct(largestSectorPct)}).`,
        explanation: SECTOR_EXPLANATION,
      }
    },
  },
  {
    key: "classes",
    label: "Distribuição por classes",
    weight: 15,
    // Balance among the classes actually held — distinct from
    // "Diversificação" above (which only counts breadth): a carteira with
    // 4 classes but 90% in one of them is diversified in count but poorly
    // distributed, which this criterion catches.
    compute: (summary) => {
      if (summary.byCategory.length === 0) {
        return { score: null, summary: "Sem posições para avaliar.", explanation: CLASSES_EXPLANATION }
      }
      const largestClassPct = Math.max(...summary.byCategory.map((c) => c.totals.allocationPct))
      const score = Math.round(15 * clamp((70 - largestClassPct) / 50, 0, 1))
      return {
        score,
        summary:
          summary.byCategory.length === 1
            ? "Toda a carteira está em uma única classe de ativos."
            : `Boa distribuição entre classes (maior classe: ${pct(largestClassPct)}).`,
        explanation: CLASSES_EXPLANATION,
      }
    },
  },
  {
    key: "liquidez",
    label: "Liquidez",
    weight: 10,
    // Share of the portfolio in exchange-traded, auto-priced assets
    // (Ações/FIIs/ETFs/BDRs synced by the market-data provider) vs.
    // manually-tracked/illiquid holdings (Renda Fixa, Outros, posições
    // manuais). This is a real, derivable signal — not a fabricated one —
    // from Company.priceSource, which is already exactly what the rest of
    // the app uses to know whether a holding trades on a public market.
    compute: (summary) => {
      const total = summary.totals.currentValueCents
      if (total === 0) return { score: null, summary: "Sem posições para avaliar.", explanation: LIQUIDITY_EXPLANATION }
      const liquidCents = summary.positions
        .filter((p) => p.priceSource === "AUTO")
        .reduce((sum, p) => sum + p.currentValueCents, 0)
      const liquidPct = (liquidCents / total) * 100
      const score = Math.round(10 * (liquidPct / 100))
      return {
        score,
        summary: `${pct(liquidPct)} da carteira está em ativos negociados em bolsa com cotação automática.`,
        explanation: LIQUIDITY_EXPLANATION,
      }
    },
  },
  {
    key: "quantidade",
    label: "Quantidade de ativos",
    weight: 10,
    // Saturates at 15 distinct positions — beyond that, more assets stops
    // adding diversification value for this criterion's purposes.
    compute: (summary) => {
      const count = summary.positions.length
      const score = Math.round(10 * clamp(count / 15, 0, 1))
      return {
        score,
        summary: `Sua carteira possui ${count} ativo${count === 1 ? "" : "s"}.`,
        explanation: QUANTITY_EXPLANATION,
      }
    },
  },
  {
    key: "internacional",
    label: "Exposição internacional",
    weight: 5,
    // The only real, derivable proxy for international exposure in this
    // schema today is BDR allocation (Brazilian Depositary Receipts of
    // foreign companies) — there is no geography/currency field on Company,
    // so this deliberately does NOT claim to measure real FX/geographic
    // exposure, only BDR share. Full marks at 15%+ in BDRs.
    compute: (summary) => {
      const total = summary.totals.currentValueCents
      if (total === 0) return { score: null, summary: "Sem posições para avaliar.", explanation: INTERNATIONAL_EXPLANATION }
      const bdrCents = summary.positions.filter((p) => p.assetClass === "BDR").reduce((sum, p) => sum + p.currentValueCents, 0)
      const bdrPct = (bdrCents / total) * 100
      const score = Math.round(5 * clamp(bdrPct / 15, 0, 1))
      return {
        score,
        summary:
          bdrPct > 0
            ? `${pct(bdrPct)} da carteira em BDRs (proxy de exposição internacional).`
            : "Nenhuma exposição internacional detectada (via BDRs) na carteira.",
        explanation: INTERNATIONAL_EXPLANATION,
      }
    },
  },
]

const CONCENTRATION_EXPLANATION = {
  whatItMeans: "Mede o quanto sua carteira depende de uma única posição.",
  howItsCalculated: "20 pontos quando a maior posição representa até 10% da carteira, caindo linearmente até 0 pontos em 50% ou mais.",
  whyItMatters: "Se um único ativo cai muito, uma carteira concentrada nele sofre bem mais do que uma bem distribuída.",
}
const SECTOR_EXPLANATION = {
  whatItMeans: "Mede a concentração setorial entre as posições que têm um setor conhecido (Ações e BDRs).",
  howItsCalculated: "20 pontos quando o maior setor representa até 15% dessas posições, caindo linearmente até 0 pontos em 60% ou mais.",
  whyItMatters: "Setores inteiros podem sofrer juntos (ex.: alta de juros afeta o setor financeiro como um todo).",
}
const CLASSES_EXPLANATION = {
  whatItMeans: "Mede o equilíbrio entre as classes de ativos que você já possui (diferente de 'Diversificação', que mede só a quantidade de classes).",
  howItsCalculated: "15 pontos quando a maior classe representa até 20% da carteira, caindo linearmente até 0 pontos em 70% ou mais.",
  whyItMatters: "Ter várias classes não ajuda muito se quase tudo está concentrado em uma delas.",
}
const LIQUIDITY_EXPLANATION = {
  whatItMeans: "Mede a parcela da carteira em ativos negociados em bolsa, com preço atualizado automaticamente.",
  howItsCalculated: "10 pontos multiplicados pela fração da carteira (em valor) com priceSource automático (Ações/FIIs/ETFs/BDRs sincronizados).",
  whyItMatters: "Ativos líquidos podem ser convertidos em dinheiro rapidamente, o que dá mais flexibilidade em momentos de necessidade.",
}
const QUANTITY_EXPLANATION = {
  whatItMeans: "Mede quantos ativos diferentes você possui na carteira.",
  howItsCalculated: "10 pontos multiplicados pela razão entre o número de ativos e 15 (o máximo considerado), limitado a 10 pontos.",
  whyItMatters: "Poucos ativos deixam a carteira mais vulnerável a eventos isolados de qualquer um deles.",
}
const INTERNATIONAL_EXPLANATION = {
  whatItMeans: "Mede a parcela da carteira em BDRs — hoje o único indicador real de exposição a empresas estrangeiras disponível na SSmoney.",
  howItsCalculated: "5 pontos multiplicados pela razão entre o percentual em BDRs e 15%, limitado a 5 pontos.",
  whyItMatters: "Exposição internacional reduz a dependência exclusiva da economia brasileira.",
}
