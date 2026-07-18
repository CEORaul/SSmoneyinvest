import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getSupabaseEnv } from "@/lib/supabase/env"

// Ações, FIIs, ETFs, Mercado, Empresa e Pesquisa são navegáveis sem login
// (como no Investidor10) — só a área logada (dashboard/carteira/favoritos/
// perfil/configurações) exige sessão.
const PUBLIC_AUTH_PATHS = ["/login", "/cadastro", "/recuperar-senha"]
const PUBLIC_PREFIXES = [
  "/",
  "/mercado",
  "/acoes",
  "/fiis",
  "/etfs",
  "/empresa",
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
    redirectUrl.pathname = "/dashboard"
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  return response
}
