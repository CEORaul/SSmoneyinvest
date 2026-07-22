import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getSupabaseEnv } from "@/lib/supabase/env"

// Ações, FIIs, ETFs, Mercado, Empresa, Comparador e Pesquisa são navegáveis
// sem login (como no Investidor10) — só a área logada (dashboard/carteira/
// favoritos/perfil/configurações) exige sessão. Quick-selects and view
// modes that need a portfolio (Minha Carteira, Maiores posições, Favoritos,
// Valor investido/atual/Lucro) degrade to empty/disabled for an anonymous
// visitor rather than the whole page requiring a session.
//
// PUBLIC_AUTH_PATHS: pages a logged-in user gets redirected away from (no
// reason to see the login form again). /reset-password is deliberately
// NOT here — the password-recovery flow lands an authenticated (recovery)
// session on that exact page, and redirecting it away would break the flow.
const PUBLIC_AUTH_PATHS = ["/login", "/register", "/forgot-password"]
const PUBLIC_PREFIXES = [
  "/",
  "/mercado",
  "/acoes",
  "/fiis",
  "/etfs",
  "/empresa",
  "/comparar",
  "/reset-password",
]

export async function updateSession(request: NextRequest) {
  // API routes authorize themselves (e.g. CRON_SECRET on /api/cron/*,
  // requireUser() inside Server Actions) — they must never be redirected to
  // /login, which would break server-to-server callers like Vercel Cron.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const { url, anonKey } = getSupabaseEnv()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublicAuthPath = PUBLIC_AUTH_PATHS.some((path) =>
    pathname.startsWith(path)
  )
  const isPublicPath =
    isPublicAuthPath ||
    PUBLIC_PREFIXES.some((path) =>
      path === "/" ? pathname === "/" : pathname.startsWith(path)
    )
  const isAuthCallback = pathname.startsWith("/auth/callback")

  if (!user && !isPublicPath && !isAuthCallback) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isPublicAuthPath) {
    const redirectUrl = request.nextUrl.clone()
    // /dashboard doesn't exist yet (a later phase) — /perfil is the one
    // real protected destination this phase ships. Revisit once Dashboard
    // lands.
    redirectUrl.pathname = "/perfil"
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  return response
}
