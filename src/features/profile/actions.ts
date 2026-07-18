"use server"

import { revalidatePath } from "next/cache"

import { preferencesSchema, type PreferencesInput } from "@/features/profile/schemas"
import { requireUser } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

export interface ActionResult {
  ok: boolean
  error?: string
}

/// The profile to update always comes from requireUser()'s server-side
/// session check, never from the form payload — a client could otherwise
/// submit an arbitrary profileId and edit someone else's preferences.
export async function updatePreferences(input: PreferencesInput): Promise<ActionResult> {
  const parsed = preferencesSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const profile = await requireUser()
  const { theme, layout, experienceMode, locale, currency } = parsed.data

  await prisma.$transaction([
    prisma.profile.update({
      where: { id: profile.id },
      data: { locale, currency },
    }),
    prisma.userPreferences.upsert({
      where: { profileId: profile.id },
      update: { theme, layout, experienceMode },
      create: { profileId: profile.id, theme, layout, experienceMode },
    }),
  ])

  revalidatePath("/perfil")
  return { ok: true }
}
