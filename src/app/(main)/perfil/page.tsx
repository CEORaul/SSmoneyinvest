import { ChangePasswordForm } from "@/features/profile/components/ChangePasswordForm"
import { PreferencesForm } from "@/features/profile/components/PreferencesForm"
import { ProfileInfoCard } from "@/features/profile/components/ProfileInfoCard"
import type { PreferencesInput } from "@/features/profile/schemas"
import { getSession, requireUser } from "@/lib/auth/session"

const LOCALES = new Set(["pt-BR", "en-US"])
const CURRENCIES = new Set(["BRL", "USD"])

export default async function ProfilePage() {
  const profile = await requireUser()
  // Same underlying call as inside requireUser() — deduped by React's
  // cache(), not a second round trip. Needed here for last_sign_in_at/
  // email_confirmed_at, which live on the Supabase auth user, not Profile.
  const user = await getSession()

  const preferencesDefaults: PreferencesInput = {
    theme: profile.preferences.theme,
    layout: profile.preferences.layout,
    experienceMode: profile.preferences.experienceMode,
    locale: LOCALES.has(profile.locale) ? (profile.locale as "pt-BR" | "en-US") : "pt-BR",
    currency: CURRENCIES.has(profile.currency) ? (profile.currency as "BRL" | "USD") : "BRL",
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações e preferências.</p>
      </div>

      <ProfileInfoCard profile={profile} user={user!} />
      <PreferencesForm defaultValues={preferencesDefaults} />
      <ChangePasswordForm />
    </div>
  )
}
