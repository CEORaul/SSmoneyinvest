"use client"

import { Bookmark, Check, ExternalLink, GitCompare, Heart, MoreHorizontal, Pin, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
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
import { SheetClose } from "@/components/ui/sheet"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { CreateAlertDialog } from "@/features/alerts/components/CreateAlertDialog"
import { NOTIFICATION_TYPE_META, type NotificationRow } from "@/features/alerts/notifications/types"
import { toggleFavoriteAction } from "@/features/company/actions"
import type { CompanySearchResult } from "@/features/portfolio/queries"
import { cn } from "@/lib/utils"
import { formatAbsoluteTime, formatRelativeTime } from "@/utils/format"

interface NotificationItemProps {
  notification: NotificationRow
  onMarkRead: (id: string) => void
  onTogglePin: (id: string) => void
  onDelete: (id: string) => void
}

const PRIORITY_LABEL = { HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa", CRITICAL: "Alta" } as const
const PRIORITY_BADGE_VARIANT = { HIGH: "destructive", MEDIUM: "secondary", LOW: "outline", CRITICAL: "destructive" } as const

/// The grouped headline ("PETR4 possui 5 novas notícias") is a read-time
/// override, not what's actually stored — the row's own `title` always
/// holds the latest individual event's title (see NotificationService's
/// group-collapse), so a card that's never grouped just shows it verbatim.
function resolveHeadline(notification: NotificationRow): string {
  if (notification.groupCount <= 1 || !notification.ticker) return notification.title
  return notification.type === "NEWS"
    ? `${notification.ticker} possui ${notification.groupCount} novas notícias`
    : `${notification.ticker} teve ${notification.groupCount} novas atualizações`
}

function primaryHref(notification: NotificationRow): string | null {
  if (notification.type === "NEWS" && typeof notification.metadata?.articleUrl === "string") {
    return notification.metadata.articleUrl
  }
  if (notification.ticker) return `/empresa/${notification.ticker}`
  return null
}

/// One row in the bell's list — icon/tipo, título (grouped-aware), corpo
/// (o contexto personalizado o produtor já computou), data/hora/tempo
/// relativo, prioridade, ativo relacionado, e as ações rápidas do spec
/// (Abrir ativo/Ver notícia/Ver dividendos/Criar alerta/Comparar/
/// Favoritar/Marcar como lida/Excluir) — cada uma reutilizando o
/// componente/Server Action já existente em vez de reimplementar.
export function NotificationItem({ notification, onMarkRead, onTogglePin, onDelete }: NotificationItemProps) {
  const [alertOpen, setAlertOpen] = useState(false)
  const [favoriting, setFavoriting] = useState(false)

  const meta = NOTIFICATION_TYPE_META[notification.type]
  const headline = resolveHeadline(notification)
  const href = primaryHref(notification)
  const isExternalLink = href?.startsWith("http") ?? false
  const createdAt = new Date(notification.createdAt)

  const searchResult: CompanySearchResult | null =
    notification.companyId && notification.ticker && notification.name && notification.assetClass && notification.priceSource
      ? {
          id: notification.companyId,
          ticker: notification.ticker,
          name: notification.name,
          assetClass: notification.assetClass,
          logoUrl: notification.logoUrl,
          priceCents: notification.priceCents ?? 0,
          priceSource: notification.priceSource,
        }
      : null

  function handleOpen() {
    if (!notification.isRead) onMarkRead(notification.id)
  }

  async function handleFavorite(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (!searchResult) return
    setFavoriting(true)
    const result = await toggleFavoriteAction(searchResult.id, searchResult.ticker)
    setFavoriting(false)
    if (result.ok) {
      toast.success(result.favorited ? `${searchResult.ticker} adicionado aos favoritos.` : `${searchResult.ticker} removido dos favoritos.`)
    } else {
      toast.error(result.error ?? "Não foi possível atualizar os favoritos.")
    }
  }

  return (
    <div
      className={cn(
        "group relative flex gap-3 border-b border-border px-4 py-3 last:border-0",
        !notification.isRead && "bg-primary/[0.03]"
      )}
    >
      <span className="mt-0.5 shrink-0 text-lg" aria-hidden>
        {meta.emoji}
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          {href ? (
            <SheetClose
              render={
                <Link
                  href={href}
                  target={isExternalLink ? "_blank" : undefined}
                  rel={isExternalLink ? "noopener noreferrer" : undefined}
                  onClick={handleOpen}
                />
              }
              className="min-w-0 flex-1 text-left"
            >
              <p className={cn("line-clamp-2 text-sm leading-snug", !notification.isRead ? "font-semibold" : "font-medium")}>
                {headline}
              </p>
            </SheetClose>
          ) : (
            <button type="button" onClick={handleOpen} className="min-w-0 flex-1 text-left">
              <p className={cn("line-clamp-2 text-sm leading-snug", !notification.isRead ? "font-semibold" : "font-medium")}>
                {headline}
              </p>
            </button>
          )}
          {!notification.isRead && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
        </div>

        {notification.body && <p className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>}

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Badge variant={PRIORITY_BADGE_VARIANT[notification.priority]} className="text-[10px]">
            {PRIORITY_LABEL[notification.priority]}
          </Badge>
          {notification.ticker && <TickerBadge ticker={notification.ticker} logoUrl={notification.logoUrl} size="sm" />}
          <span className="text-xs text-muted-foreground" title={formatAbsoluteTime(createdAt)}>
            {formatRelativeTime(createdAt)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={notification.isPinned ? "Desafixar" : "Fixar"}
            onClick={() => onTogglePin(notification.id)}
          >
            <Pin className={cn("size-3.5", notification.isPinned && "fill-current text-primary")} />
          </Button>
          {!notification.isRead && (
            <Button variant="ghost" size="icon-xs" aria-label="Marcar como lida" onClick={() => onMarkRead(notification.id)}>
              <Check className="size-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon-xs" aria-label="Excluir" onClick={() => onDelete(notification.id)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        {searchResult && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label={`Mais ações para ${searchResult.ticker}`} />}>
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={`/empresa/${searchResult.ticker}`} />}>
                <ExternalLink className="size-4" />
                Abrir ativo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAlertOpen(true)}>
                <Plus className="size-4" />
                Criar alerta
              </DropdownMenuItem>
              <DropdownMenuItem disabled={favoriting} onClick={handleFavorite}>
                <Heart className="size-4" />
                Favoritar
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={`/comparar?tickers=${searchResult.ticker}`} />}>
                <GitCompare className="size-4" />
                Comparar
              </DropdownMenuItem>
              {(notification.type === "DIVIDEND" || notification.type === "JCP") && (
                <DropdownMenuItem render={<Link href={`/empresa/${searchResult.ticker}`} />}>
                  <Bookmark className="size-4" />
                  Ver dividendos
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {searchResult && (
        <CreateAlertDialog
          open={alertOpen}
          onOpenChange={setAlertOpen}
          onSaved={() => setAlertOpen(false)}
          initialCompany={searchResult}
        />
      )}
    </div>
  )
}
