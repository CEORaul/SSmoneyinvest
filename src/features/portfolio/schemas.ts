import { z } from "zod"

import type { AssetClass } from "@/generated/prisma/client"
import { ASSET_CATEGORIES } from "@/features/portfolio/asset-category"

const positiveQuantity = z.coerce.number().positive("A quantidade deve ser maior que zero.")

const ASSET_CLASS_VALUES = ASSET_CATEGORIES.map((category) => category.value) as [
  AssetClass,
  ...AssetClass[],
]

export const tradeSchema = z.object({
  companyId: z.string().min(1, "Selecione um ativo."),
  type: z.enum(["BUY", "SELL"]),
  date: z.coerce.date(),
  quantity: positiveQuantity,
  feesCents: z.coerce.number().min(0).optional(),
  note: z.string().max(500).optional(),
  overridePriceCents: z.coerce.number().positive().optional(),
})
export type TradeInput = z.infer<typeof tradeSchema>

export const incomeSchema = z.object({
  companyId: z.string().min(1, "Selecione um ativo."),
  type: z.enum(["DIVIDEND", "JCP"]),
  date: z.coerce.date(),
  quantity: positiveQuantity,
  amountPerShareCents: z.coerce.number().positive("Informe o valor recebido por ação/cota."),
  note: z.string().max(500).optional(),
})
export type IncomeInput = z.infer<typeof incomeSchema>

export const adjustmentSchema = z.object({
  companyId: z.string().min(1, "Selecione um ativo."),
  type: z.enum(["BONUS", "SPLIT", "REVERSE_SPLIT"]),
  date: z.coerce.date(),
  quantity: positiveQuantity,
  note: z.string().max(500).optional(),
})
export type AdjustmentInput = z.infer<typeof adjustmentSchema>

// Any category can fall back to a manual entry — Cripto/Renda Fixa/Outros
// always use it (no market-data provider covers them at all), and a synced
// category like FII can use it too for something the directory doesn't
// cover (e.g. a non-listed "Fundo de Investimento").
export const manualCompanySchema = z.object({
  ticker: z
    .string()
    .trim()
    .min(1, "Informe um identificador.")
    .max(20, "Máximo de 20 caracteres.")
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1, "Informe um nome.").max(200),
  assetClass: z.enum(ASSET_CLASS_VALUES),
})
export type ManualCompanyInput = z.infer<typeof manualCompanySchema>
