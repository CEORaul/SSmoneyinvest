"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from "@/features/auth/schemas"
import { createClient } from "@/lib/supabase/server"

export interface ActionResult {
  ok: boolean
  error?: string
}

async function getOrigin(): Promise<string> {
  const headerList = await headers()
  const origin = headerList.get("origin")
  if (origin) return origin
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
  return `${protocol}://${headerList.get("host")}`
}

// Supabase's error messages come back in English — map the common ones to
// Portuguese so the UI stays consistent; anything unmapped still shows
// (better than a silently generic "algo deu errado").
function mapSupabaseError(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": "Email ou senha incorretos",
    "User already registered": "Este email já está cadastrado",
    "Email not confirmed": "Confirme seu email antes de entrar",
  }
  return known[message] ?? message
}

/// Every action re-validates with the same Zod schema the form uses
/// client-side — the client-side check is UX, this is the real security
/// boundary. Never trust data coming from the browser.
export async function signUp(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const origin = await getOrigin()
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) return { ok: false, error: mapSupabaseError(error.message) }
  return { ok: true }
}

export async function signIn(input: LoginInput, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { ok: false, error: mapSupabaseError(error.message) }

  // `next` comes from a query param an attacker could set — only ever
  // follow it if it's a same-site relative path, never an absolute URL.
  redirect(next && next.startsWith("/") ? next : "/")
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

export async function requestPasswordReset(
  input: ForgotPasswordInput
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const origin = await getOrigin()
  const supabase = await createClient()
  // Always report success regardless of whether the email is registered —
  // don't leak which addresses have accounts.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })
  return { ok: true }
}

/// Shared by both the post-recovery-link reset form and the "change
/// password" section on /perfil — Supabase's updateUser() trusts whatever
/// session is currently active, recovery or normal.
export async function updatePassword(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { ok: false, error: mapSupabaseError(error.message) }
  return { ok: true }
}
