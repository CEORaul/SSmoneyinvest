"use client"

import { ArrowDown, ArrowUp, MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LivePriceText } from "@/components/shared/live-market/LivePriceText"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { deleteAlertAction, pauseAlertAction, resumeAlertAction } from "@/features/alerts/actions"
import type { PriceAlertRow } from "@/features/alerts/types"
import { formatCurrencyCents, formatDate } from "@/utils/format"

interface AlertCardProps {
  alert: PriceAlertRow
  onEdit: (alert: PriceAlertRow) => void
  onChanged: () => void
}

const STATUS_LABEL: Record<PriceAlertRow["status"], string> = {
  ACTIVE: "Ativo",
  TRIGGERED: "Disparado",
  PAUSED: "Pausado",
  CANCELED: "Cancelado",
}

const STATUS_VARIANT: Record<PriceAlertRow["status"], "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  TRIGGERED: "secondary",
  PAUSED: "outline",
  CANCELED: "outline",
}

export function AlertCard({ alert, onEdit, onChanged }: AlertCardProps) {
  const [pending, setPending] = useState(false)

  async function handlePause() {
    setPending(true)
    const result = await pauseAlertAction(alert.id)
    setPending(false)
    if (!result.ok) return toast.error(result.error ?? "Não foi possível pausar o alerta.")
    toast.success("Alerta pausado.")
    onChanged()
  }

  async function handleResume() {
    setPending(true)
    const result = await resumeAlertAction(alert.id)
    setPending(false)
    if (!result.ok) return toast.error(result.error ?? "Não foi possível reativar o alerta.")
    toast.success("Alerta reativado.")
    onChanged()
  }

  async function handleDelete() {
    setPending(true)
    const result = await deleteAlertAction(alert.id)
    setPending(false)
    if (!result.ok) return toast.error(result.error ?? "Não foi possível excluir o alerta.")
    toast.success("Alerta excluído.")
    onChanged()
  }

  const DirectionIcon = alert.direction === "ABOVE" ? ArrowUp : ArrowDown

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <TickerBadge ticker={alert.ticker} logoUrl={alert.logoUrl} />
          <div>
            <p className="text-sm font-semibold">{alert.ticker}</p>
            <p className="text-xs text-muted-foreground">{alert.name}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label={`Ações do alerta de ${alert.ticker}`} disabled={pending} />}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(alert)}>
              <Pencil className="size-4" />
              Editar
            </DropdownMenuItem>
            {alert.status === "ACTIVE" && (
              <DropdownMenuItem onClick={handlePause}>
                <Pause className="size-4" />
                Pausar
              </DropdownMenuItem>
            )}
            {(alert.status === "PAUSED" || alert.status === "TRIGGERED") && (
              <DropdownMenuItem onClick={handleResume}>
                <Play className="size-4" />
                Reativar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Preço atual</span>
        <LivePriceText id={alert.companyId} priceCents={alert.currentPriceCents} className="font-medium tabular-nums" />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Alerta</span>
        <span className="flex items-center gap-1 font-medium tabular-nums">
          <DirectionIcon className="size-3.5" />
          {alert.direction === "ABOVE" ? "Acima de" : "Abaixo de"} {formatCurrencyCents(alert.targetPriceCents)}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Status</span>
        <Badge variant={STATUS_VARIANT[alert.status]}>{STATUS_LABEL[alert.status]}</Badge>
      </div>

      <p className="text-xs text-muted-foreground">Criado em {formatDate(alert.createdAt)}</p>
    </div>
  )
}
