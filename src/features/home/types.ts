import type { AssetClass, CompanyListItem } from "@/types"

export interface MockCompany extends CompanyListItem {
  assetClass: AssetClass
  sector: string
  highlighted?: boolean
}
