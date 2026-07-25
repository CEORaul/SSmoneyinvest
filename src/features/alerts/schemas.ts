import { z } from "zod"

export const createAlertSchema = z.object({
  companyId: z.string().min(1, "Selecione um ativo."),
  direction: z.enum(["ABOVE", "BELOW"]),
  targetPriceCents: z.coerce.number().positive("Informe um preço alvo maior que zero."),
})

export type CreateAlertSchemaInput = z.infer<typeof createAlertSchema>

export const updateAlertSchema = z.object({
  id: z.string().min(1),
  direction: z.enum(["ABOVE", "BELOW"]),
  targetPriceCents: z.coerce.number().positive("Informe um preço alvo maior que zero."),
})

export type UpdateAlertSchemaInput = z.infer<typeof updateAlertSchema>
