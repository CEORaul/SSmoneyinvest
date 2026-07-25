import { AlertsList } from "@/features/alerts/components/AlertsList"
import { getAlertsForProfile } from "@/features/alerts/queries"
import { requireUser } from "@/lib/auth/session"

export default async function AlertasPage() {
  const profile = await requireUser()
  const alerts = await getAlertsForProfile(profile.id)

  return <AlertsList initialAlerts={alerts} />
}
