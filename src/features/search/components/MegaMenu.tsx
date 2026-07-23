"use client"

import { ArrowRight, ChevronDown, Clock, GitCompare, Heart, LineChart, Wallet } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { PriceChangeTag } from "@/components/shared/PriceChangeTag"
import { Skeleton } from "@/components/ui/skeleton"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { translateSector } from "@/features/company/sector-labels"
import type { AssetClass } from "@/generated/prisma/client"
import { getMegaMenuDataAction, type SearchDropdownDefaults } from "@/features/search/actions"
import type { MegaMenuData } from "@/features/search/queries"
import { cn } from "@/lib/utils"
import { formatCurrencyCents } from "@/utils/format"

/// Platform tool links — genuinely static site navigation, not market
/// data, so hardcoding these (unlike company lists/sectors) doesn't
/// conflict with "no mocks".
const TOOLS = [
  { label: "Comparador de Ativos", href: "/comparar", icon: GitCompare },
  { label: "Minha Carteira", href: "/carteira", icon: Wallet },
  { label: "Ranking de mercado", href: "/mercado", icon: LineChart },
]

interface MegaMenuProps {
  assetClass: AssetClass
  label: string
  href: string
  isAuthenticated: boolean
  sharedDefaults: SearchDropdownDefaults | null
  onNeedSharedDefaults: () => void
}

/// One dynamic dropdown per category nav link (Ações/FIIs/ETFs) — real top
/// companies and real sectors for that category (getMegaMenuData, lazy-
/// fetched on first open), plus "Últimos vistos"/"Favoritos" reused from
/// the same SearchDropdownDefaults the global search modal already loads
/// (sharedDefaults is lifted to Navbar so opening a second menu never
/// re-fetches what the first one already has).
export function MegaMenu({ assetClass, label, href, isAuthenticated, sharedDefaults, onNeedSharedDefaults }: MegaMenuProps) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<MegaMenuData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    onNeedSharedDefaults()
    if (data || isLoading) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    getMegaMenuDataAction(assetClass).then((result) => {
      setData(result)
      setIsLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const recentViews = sharedDefaults?.recentViews ?? []
  const favorites = sharedDefaults?.favorites ?? []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          />
        }
      >
        {label}
        <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        className="w-[38rem] max-w-[92vw] gap-0 p-0"
      >
        <div className="grid flex-1 grid-cols-3 gap-6 p-5">
          <div className="col-span-2 space-y-1">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Principais {label}
            </p>
            {isLoading && !data ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : data && data.topCompanies.length > 0 ? (
              <div className="space-y-0.5">
                {data.topCompanies.map((company) => (
                  <Link
                    key={company.ticker}
                    href={`/empresa/${company.ticker}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
                  >
                    <TickerBadge ticker={company.ticker} logoUrl={company.logoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{company.ticker}</p>
                      <p className="truncate text-xs text-muted-foreground">{company.name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium tabular-nums">{formatCurrencyCents(company.priceCents)}</p>
                      <PriceChangeTag changePct={company.changePct} className="justify-end text-xs" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-2 py-4 text-sm text-muted-foreground">Nenhum ativo sincronizado ainda.</p>
            )}

            {data && data.sectors.length > 0 && (
              <div className="pt-3">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Setores</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.sectors.map((sector) => (
                    <span
                      key={sector}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {translateSector(sector)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 border-l border-border pl-5">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ferramentas</p>
              <div className="space-y-0.5">
                {TOOLS.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <tool.icon className="size-3.5" />
                    {tool.label}
                  </Link>
                ))}
              </div>
            </div>

            {recentViews.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <Clock className="size-3" /> Vistos recentemente
                </p>
                <div className="space-y-0.5">
                  {recentViews.slice(0, 3).map((item) => (
                    <Link
                      key={item.ticker}
                      href={`/empresa/${item.ticker}`}
                      onClick={() => setOpen(false)}
                      className="block truncate rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {item.ticker}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {isAuthenticated && favorites.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <Heart className="size-3" /> Favoritos
                </p>
                <div className="space-y-0.5">
                  {favorites.slice(0, 3).map((item) => (
                    <Link
                      key={item.ticker}
                      href={`/empresa/${item.ticker}`}
                      onClick={() => setOpen(false)}
                      className="block truncate rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {item.ticker}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <Link
          href={href}
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-1.5 rounded-b-lg border-t border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-muted"
        >
          Ver todas as {label}
          <ArrowRight className="size-3.5" />
        </Link>
      </PopoverContent>
    </Popover>
  )
}
