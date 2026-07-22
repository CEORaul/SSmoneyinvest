import { AssetCategoryListing } from "@/features/market/components/AssetCategoryListing"

export default function EtfsPage() {
  return (
    <AssetCategoryListing
      assetClass="ETF"
      title="ETFs"
      description="Todos os ETFs sincronizados na SSmoney, ordenados por valor de mercado."
    />
  )
}
