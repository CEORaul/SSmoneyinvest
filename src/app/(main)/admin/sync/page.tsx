import { SyncPanel } from "@/features/admin/components/SyncPanel"

// Same 60s ceiling the cron routes declare — the directory sync job can
// take a while against ~2000 companies in one call.
export const maxDuration = 60

export default function AdminSyncPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sincronização de mercado</h1>
        <p className="text-muted-foreground">
          Disparo manual dos jobs de sincronização — necessário enquanto os cron jobs da Vercel
          estiverem desativados (plano Hobby só permite agendamento diário).
        </p>
      </div>
      <SyncPanel />
    </div>
  )
}
