import { AssetCategoryListing } from "@/features/market/components/AssetCategoryListing"

export default function AcoesPage() {
  return (
    <AssetCategoryListing
      assetClass="STOCK"
      title="Ações"
      description="Todas as ações sincronizadas na SSmoney, ordenadas por valor de mercado."
    />
  )
}
