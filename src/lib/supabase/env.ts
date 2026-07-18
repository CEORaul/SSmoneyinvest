/**
 * Supabase's own client constructors throw a generic "Your project's URL and
 * Key are required" error with no indication of which variable is missing or
 * which deployment environment it's missing in. This makes that failure mode
 * actually diagnosable in production logs.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const missing: string[] = []
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL")
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")

  if (missing.length > 0 || !url || !anonKey) {
    throw new Error(
      `Supabase: variável(is) de ambiente ausente(s): ${missing.join(", ")}. ` +
        `Defina-as no .env local ou nas variáveis de ambiente do deploy.`
    )
  }

  return { url, anonKey }
}
