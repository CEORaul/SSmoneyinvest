import { z } from "zod"

export const preferencesSchema = z.object({
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]),
  layout: z.enum(["COMFORTABLE", "COMPACT"]),
  experienceMode: z.enum(["BEGINNER", "ADVANCED"]),
  locale: z.enum(["pt-BR", "en-US"]),
  currency: z.enum(["BRL", "USD"]),
})
export type PreferencesInput = z.infer<typeof preferencesSchema>
