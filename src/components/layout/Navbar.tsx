"use client"

import Link from "next/link"
import { Menu, Search, TrendingUp } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { NavUserMenu } from "@/features/auth/components/NavUserMenu"
import { GlobalSearch } from "@/features/search/components/GlobalSearch"
import { MegaMenu } from "@/features/search/components/MegaMenu"
import { getSearchDropdownDefaultsAction, type SearchDropdownDefaults } from "@/features/search/actions"
import { cn } from "@/lib/utils"

const CATEGORY_MENUS = [
  { assetClass: "STOCK" as const, label: "Ações", href: "/acoes" },
  { assetClass: "FII" as const, label: "FIIs", href: "/fiis" },
  { assetClass: "ETF" as const, label: "ETFs", href: "/etfs" },
]

const PLAIN_NAV_LINKS = [
  { label: "Mercado", href: "/mercado" },
  { label: "Comparar", href: "/comparar" },
]

export interface NavbarUser {
  fullName: string | null
  email: string
  avatarUrl: string | null
}

interface NavbarProps {
  user?: NavbarUser | null
}

export function Navbar({ user }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [sharedDefaults, setSharedDefaults] = useState<SearchDropdownDefaults | null>(null)
  const isFetchingShared = useRef(false)
  const isAuthenticated = !!user

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Shared between the search modal and every category mega menu — opening
  // any one of them loads this once; opening a second never re-fetches.
  // A ref (not state) guards the in-flight fetch since that guard itself
  // never needs to trigger a render.
  const ensureSharedDefaults = useCallback(() => {
    if (sharedDefaults || isFetchingShared.current) return
    isFetchingShared.current = true
    getSearchDropdownDefaultsAction().then((result) => {
      setSharedDefaults(result)
      isFetchingShared.current = false
    })
  }, [sharedDefaults])

  // Cmd/Ctrl+K opens global search from anywhere — the Spotlight/GitHub-
  // style shortcut the spec explicitly compares this feature to.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setIsSearchOpen(true)
        ensureSharedDefaults()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [ensureSharedDefaults])

  function handleOpenSearch() {
    setIsSearchOpen(true)
    ensureSharedDefaults()
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        isScrolled
          ? "border-b border-border bg-background/75 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="size-4.5" />
          </span>
          SSmoney Invest
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {CATEGORY_MENUS.map((menu) => (
            <MegaMenu
              key={menu.assetClass}
              assetClass={menu.assetClass}
              label={menu.label}
              href={menu.href}
              isAuthenticated={isAuthenticated}
              sharedDefaults={sharedDefaults}
              onNeedSharedDefaults={ensureSharedDefaults}
            />
          ))}
          {PLAIN_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Buscar ativos"
            onClick={() => handleOpenSearch()}
          >
            <Search className="size-4.5" />
          </Button>
          <ThemeToggle />
          {user ? (
            <>
              <Button variant="ghost" nativeButton={false} render={<Link href="/mercado" />}>
                Mercado
              </Button>
              <Button variant="ghost" nativeButton={false} render={<Link href="/radar" />}>
                Radar
              </Button>
              <Button variant="outline" nativeButton={false} render={<Link href="/carteira" />}>
                Carteira
              </Button>
              <NavUserMenu
                fullName={user.fullName}
                email={user.email}
                avatarUrl={user.avatarUrl}
              />
            </>
          ) : (
            <>
              <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
                Entrar
              </Button>
              <Button nativeButton={false} render={<Link href="/register" />}>
                Começar Gratuitamente
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Buscar ativos"
            onClick={() => handleOpenSearch()}
          >
            <Search className="size-4.5" />
          </Button>
          {user && (
            <NavUserMenu
              fullName={user.fullName}
              email={user.email}
              avatarUrl={user.avatarUrl}
            />
          )}
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Abrir menu" />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <div className="mt-10 flex flex-col gap-1 px-2">
                {CATEGORY_MENUS.map((menu) => (
                  <SheetClose
                    key={menu.href}
                    render={<Link href={menu.href} />}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    {menu.label}
                  </SheetClose>
                ))}
                {PLAIN_NAV_LINKS.map((link) => (
                  <SheetClose
                    key={link.href}
                    render={<Link href={link.href} />}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    {link.label}
                  </SheetClose>
                ))}
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="px-1 text-sm font-medium text-muted-foreground">Tema</span>
                  <ThemeToggle />
                </div>
                {!user && (
                  <div className="flex flex-col gap-2 pt-2">
                    <SheetClose
                      render={<Link href="/login" />}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      Entrar
                    </SheetClose>
                    <SheetClose
                      render={<Link href="/register" />}
                      className={buttonVariants({})}
                    >
                      Começar Gratuitamente
                    </SheetClose>
                  </div>
                )}
                {user && (
                  <div className="flex flex-col gap-2 pt-2">
                    <SheetClose
                      render={<Link href="/mercado" />}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      Mercado
                    </SheetClose>
                    <SheetClose
                      render={<Link href="/radar" />}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      Radar
                    </SheetClose>
                    <SheetClose
                      render={<Link href="/carteira" />}
                      className={buttonVariants({})}
                    >
                      Carteira
                    </SheetClose>
                    <SheetClose
                      render={<Link href="/perfil" />}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      Perfil
                    </SheetClose>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      <GlobalSearch
        variant="modal"
        isAuthenticated={isAuthenticated}
        initialDefaults={sharedDefaults ?? undefined}
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
    </header>
  )
}
