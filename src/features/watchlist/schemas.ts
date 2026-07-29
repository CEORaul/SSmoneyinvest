import { z } from "zod"

export const createWatchlistSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para a lista.").max(60, "Nome muito longo."),
  description: z.string().trim().max(200, "Descrição muito longa.").optional(),
  icon: z.string().trim().max(8).optional(),
  color: z.string().trim().max(20).optional(),
})

export type CreateWatchlistSchemaInput = z.infer<typeof createWatchlistSchema>

export const updateWatchlistSchema = createWatchlistSchema.extend({
  id: z.string().min(1),
})

export type UpdateWatchlistSchemaInput = z.infer<typeof updateWatchlistSchema>

export const addWatchlistItemSchema = z.object({
  watchlistId: z.string().min(1),
  companyId: z.string().min(1, "Selecione um ativo."),
})

export type AddWatchlistItemSchemaInput = z.infer<typeof addWatchlistItemSchema>
