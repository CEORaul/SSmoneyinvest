import { CompanyCard } from "@/components/shared/CompanyCard"
import { getCompaniesByAssetClass } from "@/features/market/queries"
import type { AssetClass } from "@/generated/prisma/client"

interface AssetCategoryListingProps {
  assetClass: AssetClass
  title: string
  description: string
}

/// One shared listing shape for /acoes, /fiis, /etfs — real companies from
/// the database, ranked by market cap, reusing the same CompanyCard the
/// Home page's popular/movers sections already use. No pagination or
/// filtering yet (the category counts are still small); each card links
/// straight into /empresa/[ticker], the single source of truth for asset
/// detail everywhere in the app.
export async function AssetCategoryListing({ assetClass, title, description }: AssetCategoryListingProps) {
  const companies = await getCompaniesByAssetClass(assetClass)

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {companies.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Nenhum ativo sincronizado nesta categoria ainda.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard key={company.ticker} company={company} />
          ))}
        </div>
      )}
    </div>
  )
}
