import Link from "next/link"
import { TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { NavUserMenu } from "@/features/auth/components/NavUserMenu"
import { NotificationBell } from "@/features/alerts/components/NotificationBell"
import { requireUser } from "@/lib/auth/session"

// Intentionally minimal — no sidebar nav yet. The full authenticated shell
// (Dashboard/Carteira/Favoritos navigation) is scope for those phases;
// this is just enough chrome to host /perfil safely behind requireUser().
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await requireUser()

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="flex h-16 w-full items-center justify-between px-6 lg:px-8 xl:px-10 2xl:px-12">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrendingUp className="size-4.5" />
            </span>
            SSmoney Invest
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/mercado" />}>
              Mercado
            </Button>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/radar" />}>
              Radar
            </Button>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/comparar" />}>
              Comparar
            </Button>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/watchlist" />}>
              Monitor de Ativos
            </Button>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/noticias" />}>
              Notícias
            </Button>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/alertas" />}>
              Alertas
            </Button>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/finia" />}>
              SS AI
            </Button>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/carteira" />}>
              Carteira
            </Button>
            <NotificationBell />
            <ThemeToggle />
            <NavUserMenu
              fullName={profile.fullName}
              email={profile.email}
              avatarUrl={profile.avatarUrl}
            />
          </div>
        </div>
      </header>
      <main className="w-full flex-1 px-6 py-10 lg:px-8 xl:px-10 2xl:px-12">{children}</main>
    </div>
  )
}
