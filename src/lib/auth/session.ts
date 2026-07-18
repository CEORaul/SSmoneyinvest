import { cache } from "react"
import { redirect } from "next/navigation"

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
 * Every Server Component/Action in the logged-in area calls this first.
 * A Postgres trigger provisions Profile on signup; the upsert here is a
 * defensive fallback in case that trigger is ever missing or delayed.
 */
export const requireUser = cache(async () => {
  const user = await getSession()

  if (!user) {
    redirect("/login")
  }

  const profile = await prisma.profile.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      email: user.email!,
    },
  })

  return profile
})
