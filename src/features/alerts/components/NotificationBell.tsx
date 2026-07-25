"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TickerBadge } from "@/components/shared/TickerBadge"
import {
  getRecentNotificationsAction,
  getUnreadNotificationCountAction,
  markNotificationsReadAction,
} from "@/features/alerts/actions"
import type { AlertNotificationRow } from "@/features/alerts/types"
import { formatCurrencyCents, formatRelativeTime } from "@/utils/format"

// No push/WebSocket channel exists yet (see PREPARAÇÃO FUTURA in the spec) —
// a fixed poll is the interim mechanism, swappable later for a real push
// subscription without changing anything that reads unreadCount/notifications.
const POLL_INTERVAL_MS = 45_000

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<AlertNotificationRow[]>([])
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function poll() {
      const count = await getUnreadNotificationCountAction()
      if (!cancelled) setUnreadCount(count)
    }
    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  async function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) return
    const list = await getRecentNotificationsAction()
    setNotifications(list)
    setLoaded(true)
    if (unreadCount > 0) {
      setUnreadCount(0)
      await markNotificationsReadAction()
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={<Button variant="ghost" size="icon" aria-label="Notificações" className="relative" />}>
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-loss" aria-hidden />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-sm font-medium">Notificações</p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!loaded ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma notificação ainda.</div>
          ) : (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                href={`/empresa/${notification.ticker}`}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 border-b border-border px-3 py-3 last:border-0 hover:bg-accent/50"
              >
                <TickerBadge ticker={notification.ticker} logoUrl={notification.logoUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{notification.ticker}</span> atingiu seu preço alvo.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Preço atual: {formatCurrencyCents(notification.triggeredPriceCents)} · Alvo:{" "}
                    {formatCurrencyCents(notification.targetPriceCents)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatRelativeTime(new Date(notification.createdAt))}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
        <div className="border-t border-border p-1.5">
          <Link
            href="/alertas"
            onClick={() => setOpen(false)}
            className="block rounded-md px-2 py-1.5 text-center text-xs font-medium text-primary hover:bg-accent"
          >
            Ver todos os alertas
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
