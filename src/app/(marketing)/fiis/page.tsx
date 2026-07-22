import { AssetCategoryListing } from "@/features/market/components/AssetCategoryListing"

export default function FiisPage() {
  return (
    <AssetCategoryListing
      assetClass="FII"
      title="Fundos Imobiliários"
      description="Todos os FIIs (incluindo FI-Agro e FI-Infra) sincronizados na SSmoney, ordenados por valor de mercado."
    />
  )
}
