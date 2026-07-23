import { Newspaper } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RadarNewsItem } from "@/features/radar/types"

interface NewsRadarSectionProps {
  news: RadarNewsItem[]
}

/// "Notícias Inteligentes" — only ever shows news tied to the carteira/
/// favoritos/watchlist, never a random market feed (spec point 7 is
/// explicit). No news provider is wired up yet, so `news` is always `[]`
/// today; the card/list shape below is already what a real provider's
/// items would render into.
export function NewsRadarSection({ news }: NewsRadarSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notícias Inteligentes</CardTitle>
      </CardHeader>
      <CardContent>
        {news.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Newspaper className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhuma notícia disponível ainda para os ativos da sua carteira e favoritos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {news.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-border p-3 transition-colors hover:bg-accent/60"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.companyName} · {item.source}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
                <span className="mt-2 inline-block text-xs font-medium text-primary">Ler mais</span>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
