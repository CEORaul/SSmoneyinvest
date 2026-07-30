"use client"

import { Bell, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  deleteNotificationAction,
  getNotificationsAction,
  getUnreadNotificationsCountAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  togglePinNotificationAction,
} from "@/features/alerts/notifications/actions"
import { NotificationItem } from "@/features/alerts/notifications/components/NotificationItem"
import {
  NOTIFICATION_FILTER_LABELS,
  NOTIFICATION_FILTER_ORDER,
  type NotificationFilterKey,
  type NotificationRow,
} from "@/features/alerts/notifications/types"
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

// No push/WebSocket channel exists yet — a fixed poll is the interim
// mechanism, swappable later for a real push subscription without changing
// anything that reads unreadCount/notifications. Same interval as before
// this evolution (only the count, never the full list, is polled).
const POLL_INTERVAL_MS = 45_000

/// The Central de Notificações Inteligente — evolves the same Sheet-based
/// bell into a filterable, prioritized, pinnable, groupable feed backed by
/// RadarNotification (see notifications/service.ts). Every notification
/// type/producer this bell can show is documented on RadarNotification's
/// own schema.prisma doc; this component only renders and mutates what
/// notifications/queries.ts and notifications/actions.ts already expose.
export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<NotificationFilterKey>("all")
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const isMobile = useMediaQuery("(max-width: 639px)")
  const requestIdRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    async function poll() {
      const count = await getUnreadNotificationsCountAction()
      if (!cancelled) setUnreadCount(count)
    }
    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  async function loadFeed(nextFilter: NotificationFilterKey) {
    const requestId = ++requestIdRef.current
    setLoading(true)
    const result = await getNotificationsAction({ filter: nextFilter })
    if (requestId !== requestIdRef.current) return
    setNotifications(result.notifications)
    setCursor(result.nextCursor)
    setLoading(false)
    setLoaded(true)
  }

  async function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && !loaded) await loadFeed(filter)
  }

  function handleFilterChange(next: NotificationFilterKey) {
    setFilter(next)
    setLoaded(false)
    loadFeed(next)
  }

  async function handleLoadMore() {
    if (!cursor) return
    const requestId = requestIdRef.current
    setLoadingMore(true)
    const result = await getNotificationsAction({ filter, cursor })
    if (requestId !== requestIdRef.current) return
    setNotifications((current) => [...current, ...result.notifications])
    setCursor(result.nextCursor)
    setLoadingMore(false)
  }

  const sentinelRef = useInfiniteScrollSentinel(handleLoadMore, cursor != null && !loading)

  async function handleMarkRead(id: string) {
    let wasUnread = false
    setNotifications((current) =>
      current.map((n) => {
        if (n.id !== id || n.isRead) return n
        wasUnread = true
        return { ...n, isRead: true }
      })
    )
    if (wasUnread) setUnreadCount((current) => Math.max(0, current - 1))
    await markNotificationReadAction(id)
  }

  async function handleMarkAllRead() {
    setNotifications((current) => current.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    await markAllNotificationsReadAction()
  }

  async function handleTogglePin(id: string) {
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)))
    await togglePinNotificationAction(id)
    // Pin order affects sort — refetch so the list re-settles into the
    // server's real pinned-first/priority/recency order.
    await loadFeed(filter)
  }

  async function handleDelete(id: string) {
    const wasUnread = notifications.find((n) => n.id === id)?.isRead === false
    setNotifications((current) => current.filter((n) => n.id !== id))
    if (wasUnread) setUnreadCount((current) => Math.max(0, current - 1))
    await deleteNotificationAction(id)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Notificações" className="relative" />}>
        <Bell className="size-4.5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.5 }}
              className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-loss px-0.5 text-[10px] leading-none font-semibold text-white"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </SheetTrigger>

      <SheetContent side={isMobile ? "bottom" : "right"} className={cn("flex w-full flex-col gap-0 p-0", isMobile ? "h-[85vh]" : "sm:max-w-md")}>
        <SheetHeader className="flex-row items-center justify-between gap-2 border-b border-border">
          <SheetTitle>Notificações</SheetTitle>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              <Check className="size-3.5" />
              Marcar todas como lidas
            </Button>
          )}
        </SheetHeader>

        <Tabs value={filter} onValueChange={(value) => handleFilterChange(value as NotificationFilterKey)} className="shrink-0 border-b border-border px-4 py-2">
          <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
            {NOTIFICATION_FILTER_ORDER.map((key) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {NOTIFICATION_FILTER_LABELS[key]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma notificação por aqui.</div>
          ) : (
            <>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onTogglePin={handleTogglePin}
                  onDelete={handleDelete}
                />
              ))}
              {cursor && (
                <div ref={sentinelRef} className="flex justify-center py-4">
                  {loadingMore && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
                </div>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-3">
          <SheetClose
            render={<Link href="/alertas" />}
            className="block rounded-md px-2 py-1.5 text-center text-sm font-medium text-primary hover:bg-accent"
          >
            Ver todos os alertas
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}
