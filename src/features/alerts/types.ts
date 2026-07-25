import type { AlertDirection, AlertNotificationStatus, AlertStatus, AssetClass } from "@/generated/prisma/client"

export type { AlertDirection, AlertNotificationStatus, AlertStatus }

/// One row for the /alertas list — the alert joined with just the Company
/// fields the card needs, so the UI never has to re-fetch the asset.
export interface PriceAlertRow {
  id: string
  companyId: string
  ticker: string
  name: string
  logoUrl: string | null
  assetClass: AssetClass
  currentPriceCents: number
  direction: AlertDirection
  targetPriceCents: number
  status: AlertStatus
  triggeredAt: string | null
  triggeredPriceCents: number | null
  createdAt: string
}

/// One row in the notification bell — carries its own target/triggered
/// price pair so it renders correctly even if the source PriceAlert was
/// later edited or deleted (the FK is ON DELETE CASCADE, but an edit to the
/// still-live alert must never rewrite history already shown to the user).
export interface AlertNotificationRow {
  id: string
  alertId: string
  companyId: string
  ticker: string
  name: string
  logoUrl: string | null
  direction: AlertDirection
  targetPriceCents: number
  triggeredPriceCents: number
  status: AlertNotificationStatus
  createdAt: string
}

export interface CreateAlertInput {
  companyId: string
  direction: AlertDirection
  targetPriceCents: number
}

export interface UpdateAlertInput {
  id: string
  direction: AlertDirection
  targetPriceCents: number
}

export interface AlertActionResult {
  ok: boolean
  error?: string
}
