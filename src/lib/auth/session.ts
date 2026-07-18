import { cache } from "react"
import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export const getSession = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/**
 * No Postgres trigger provisions Profile here (unlike the sibling SSmoney
 * project) — this upsert is the one and only provisioning path, run on the
 * user's first authenticated request. On creation it seeds fullName/
 * avatarUrl from OAuth metadata (Google sign-in populates these) so the
 * Profile page has real data instead of blanks; on repeat visits it
 * deliberately doesn't overwrite them, so a user-edited name survives.
 */
async function provisionProfile(user: User) {
  const metadata = (user.user_metadata ?? {}) as {
    full_name?: string
    name?: string
    avatar_url?: string
    picture?: string
  }

  const profile = await prisma.profile.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      email: user.email!,
      fullName: metadata.full_name ?? metadata.name ?? null,
      avatarUrl: metadata.avatar_url ?? metadata.picture ?? null,
    },
  })

  const preferences = await prisma.userPreferences.upsert({
    where: { profileId: profile.id },
    update: {},
    create: { profileId: profile.id },
  })

  return { ...profile, preferences }
}

/** Every Server Component/Action in the logged-in area calls this first. */
export const requireUser = cache(async () => {
  const user = await getSession()

  if (!user) {
    redirect("/login")
  }

  return provisionProfile(user)
})

/**
 * Same provisioning as requireUser(), but for contexts that must render
 * for both logged-in and anonymous visitors (public marketing pages) —
 * returns null instead of redirecting when there's no session.
 */
export const getOptionalProfile = cache(async () => {
  const user = await getSession()
  if (!user) return null
  return provisionProfile(user)
})
