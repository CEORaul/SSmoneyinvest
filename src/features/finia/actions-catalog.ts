import type { AssetClass, PriceSource } from "@/generated/prisma/client"

export type FiniaActionType = "NAVIGATE" | "PREFILL_ALERT"

export interface FiniaAlertPrefill {
  companyId: string
  ticker: string
  name: string
  logoUrl: string | null
  priceCents: number
  assetClass: AssetClass
  priceSource: PriceSource
  direction: "ABOVE" | "BELOW"
  targetPriceCents: number
}

/// What FinIA can actually do today, per the spec's own scope: navigate, or
/// open a form pre-filled (never submit anything on the user's behalf
/// silently — PREFILL_ALERT still requires the user to click "Criar alerta"
/// in the real dialog). Adding a genuinely new action type later (e.g. one
/// that submits a trade) means adding one more variant here plus one more
/// client-side handler in FiniaActionCard.tsx — the chat/context/streaming
/// layers underneath never need to change.
export interface FiniaAction {
  type: FiniaActionType
  label: string
  href: string
  prefill?: FiniaAlertPrefill
}
