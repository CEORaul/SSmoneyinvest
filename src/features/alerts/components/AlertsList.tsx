"use client"

import { Bell, Plus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { AlertCard } from "@/features/alerts/components/AlertCard"
import { CreateAlertDialog } from "@/features/alerts/components/CreateAlertDialog"
import { getAlertsAction } from "@/features/alerts/actions"
import type { PriceAlertRow } from "@/features/alerts/types"

interface AlertsListProps {
  initialAlerts: PriceAlertRow[]
}

export function AlertsList({ initialAlerts }: AlertsListProps) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAlert, setEditingAlert] = useState<PriceAlertRow | null>(null)

  async function refresh() {
    setAlerts(await getAlertsAction())
  }

  function handleCreate() {
    setEditingAlert(null)
    setDialogOpen(true)
  }

  function handleEdit(alert: PriceAlertRow) {
    setEditingAlert(alert)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alertas Inteligentes</h1>
          <p className="text-muted-foreground">
            Nunca mais perca uma oportunidade. Seja avisado quando um ativo atingir o preço desejado.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="size-4" />
          Novo alerta
        </Button>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Bell className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium">Nenhum alerta criado</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Crie um alerta para ser avisado assim que um ativo atingir o preço que você
              definir.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="size-4" />
            Novo alerta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onEdit={handleEdit} onChanged={refresh} />
          ))}
        </div>
      )}

      <CreateAlertDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={refresh} editAlert={editingAlert} />
    </div>
  )
}
