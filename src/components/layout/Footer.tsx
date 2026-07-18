import Link from "next/link"
import { TrendingUp } from "lucide-react"

const FOOTER_COLUMNS = [
  {
    title: "Produto",
    links: [
      { label: "Mercado", href: "/mercado" },
      { label: "Ações", href: "/acoes" },
      { label: "FIIs", href: "/fiis" },
      { label: "ETFs", href: "/etfs" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Política de Privacidade", href: "/privacidade" },
      { label: "Termos de Uso", href: "/termos" },
      { label: "Contato", href: "/contato" },
    ],
  },
  {
    title: "Comunidade",
    links: [
      { label: "GitHub", href: "https://github.com" },
      { label: "Roadmap", href: "/roadmap" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <TrendingUp className="size-4" />
              </span>
              SSmoney Invest
            </Link>
            <p className="mt-3 max-w-[22ch] text-sm text-muted-foreground">
              Ações, FIIs e ETFs em um só lugar.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold">{column.title}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SSmoney Invest. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            Dados de mercado meramente ilustrativos.
          </p>
        </div>
      </div>
    </footer>
  )
}
