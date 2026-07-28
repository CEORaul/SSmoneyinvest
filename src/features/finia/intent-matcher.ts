import "server-only"

import type { AssetClass } from "@/generated/prisma/client"
import type { FiniaAction } from "@/features/finia/actions-catalog"
import { prisma } from "@/lib/prisma"

const NAV_VERBS = "mostrar|abrir|ir para|ir pro|acessar|ver|quero ver|leve-me para|me leve para"
const NAV_VERB_GROUP = `(?:${NAV_VERBS})`
const HAS_NAV_VERB = new RegExp(`\\b(?:${NAV_VERBS})\\b`, "i")

interface StaticNavIntent {
  pattern: RegExp
  label: string
  href: string
}

const STATIC_NAV_INTENTS: StaticNavIntent[] = [
  { pattern: new RegExp(`${NAV_VERB_GROUP}\\s+(o\\s+|a\\s+)?mercado\\b`, "i"), label: "Mercado", href: "/mercado" },
  { pattern: new RegExp(`${NAV_VERB_GROUP}\\s+(a\\s+)?(minha\\s+)?carteira\\b`, "i"), label: "Carteira", href: "/carteira" },
  { pattern: new RegExp(`${NAV_VERB_GROUP}\\s+(o\\s+)?comparador\\b`, "i"), label: "Comparador", href: "/comparar" },
  { pattern: new RegExp(`${NAV_VERB_GROUP}\\s+(o\\s+)?radar\\b`, "i"), label: "Radar", href: "/radar" },
  { pattern: new RegExp(`${NAV_VERB_GROUP}\\s+(os\\s+|meus\\s+)?alertas\\b`, "i"), label: "Alertas", href: "/alertas" },
  { pattern: new RegExp(`${NAV_VERB_GROUP}\\s+(o\\s+|meu\\s+)?score\\b`, "i"), label: "Score da Carteira", href: "/score" },
]

interface CategoryNavIntent {
  pattern: RegExp
  label: string
  assetClass: AssetClass
}

// Reuses /carteira's own ?categoria= URL filter (already built for
// PortfolioBoard's FilterBar) — never a new, parallel filtering mechanism.
const CATEGORY_NAV_INTENTS: CategoryNavIntent[] = [
  { pattern: new RegExp(`${NAV_VERB_GROUP}\\s+(meus\\s+)?fiis?\\b`, "i"), label: "Meus FIIs", assetClass: "FII" },
  { pattern: new RegExp(`${NAV_VERB_GROUP}\\s+(meus\\s+)?etfs?\\b`, "i"), label: "Meus ETFs", assetClass: "ETF" },
  { pattern: new RegExp(`${NAV_VERB_GROUP}\\s+(minhas\\s+)?a[çc][õo]es\\b`, "i"), label: "Minhas Ações", assetClass: "STOCK" },
  { pattern: new RegExp(`${NAV_VERB_GROUP}\\s+(meus\\s+)?bdrs?\\b`, "i"), label: "Meus BDRs", assetClass: "BDR" },
  { pattern: new RegExp(`${NAV_VERB_GROUP}\\s+(minhas\\s+)?cripto(moedas)?\\b`, "i"), label: "Minhas Criptomoedas", assetClass: "CRYPTO" },
]

// B3 tickers are a 4-char root (usually letters, but sometimes a root
// includes a digit, e.g. B3SA3) followed by a 1-2 digit share-type suffix.
// Loosening the root to alphanumeric risks matching a plain number as a
// "ticker" — harmless here since every match is verified against the real
// Company table below before becoming an action.
const TICKER_PATTERN = /\b([A-Z0-9]{4}\d{1,2})\b/
const CREATE_ALERT_PATTERN =
  /criar?\s+(um\s+)?alerta\s+(para|de)\s+([a-zA-Z0-9]{4}\d{1,2})\s+(abaixo de|acima de)\s+r?\$?\s*([\d.,]+)/i

/// Deterministic, regex-based intent matching — never an LLM "decides" an
/// action, on purpose: a function-calling model could hallucinate a ticker
/// or a price, while a regex either matches real, explicit phrasing or it
/// doesn't. Every match that references a specific asset is verified
/// against the real Company table before becoming an action, so FinIA can
/// never offer to "open" or "create an alert for" a ticker that doesn't
/// exist. Returns null when nothing matches, and the caller falls through
/// to a normal AI chat answer. Real LLM function-calling can replace this
/// dispatch layer later without changing FiniaAction's shape or any caller
/// — see the architecture report.
export async function matchFiniaIntent(message: string): Promise<FiniaAction | null> {
  for (const intent of STATIC_NAV_INTENTS) {
    if (intent.pattern.test(message)) {
      return { type: "NAVIGATE", label: intent.label, href: intent.href }
    }
  }

  for (const intent of CATEGORY_NAV_INTENTS) {
    if (intent.pattern.test(message)) {
      return { type: "NAVIGATE", label: intent.label, href: `/carteira?categoria=${intent.assetClass}` }
    }
  }

  const alertMatch = message.match(CREATE_ALERT_PATTERN)
  if (alertMatch) {
    const ticker = alertMatch[3].toUpperCase()
    const direction = alertMatch[4].toLowerCase().startsWith("acima") ? "ABOVE" : "BELOW"
    const rawPrice = alertMatch[5].replace(/\./g, "").replace(",", ".")
    const targetPriceCents = Math.round(Number(rawPrice) * 100)
    if (!Number.isNaN(targetPriceCents) && targetPriceCents > 0) {
      const company = await prisma.company.findUnique({
        where: { ticker },
        select: { id: true, ticker: true, name: true, logoUrl: true, priceCents: true, assetClass: true, priceSource: true },
      })
      if (company) {
        return {
          type: "PREFILL_ALERT",
          label: `Criar alerta para ${company.ticker}`,
          href: "/alertas",
          prefill: {
            companyId: company.id,
            ticker: company.ticker,
            name: company.name,
            logoUrl: company.logoUrl,
            priceCents: company.priceCents,
            assetClass: company.assetClass,
            priceSource: company.priceSource,
            direction,
            targetPriceCents,
          },
        }
      }
    }
  }

  if (HAS_NAV_VERB.test(message)) {
    const tickerMatch = message.toUpperCase().match(TICKER_PATTERN)
    if (tickerMatch) {
      const ticker = tickerMatch[1]
      const company = await prisma.company.findUnique({ where: { ticker }, select: { ticker: true } })
      if (company) {
        return { type: "NAVIGATE", label: `Página de ${company.ticker}`, href: `/empresa/${company.ticker}` }
      }
    }
  }

  return null
}
