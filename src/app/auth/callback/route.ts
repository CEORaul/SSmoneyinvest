import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

/// Single landing point for every Supabase redirect-based flow: Google
/// OAuth, email confirmation after signup, and the password-recovery link.
/// Exchanges the `code` for a session, then forwards to `next` — validated
/// as a same-site relative path, since it's attacker-controllable input.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next")
  const next = rawNext && rawNext.startsWith("/") ? rawNext : "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
