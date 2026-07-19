import { z } from "zod"

const positiveQuantity = z.coerce.number().positive("A quantidade deve ser maior que zero.")

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
