"use server"

import { revalidatePath } from "next/cache"

import { getAllSectors, searchMarketAssets } from "@/features/market/discovery-queries"
import { deleteMarketFilter, getSavedMarketFilters, saveMarketFilter } from "@/features/market/saved-filters"
import type {
  MarketFilters,
  MarketSearchResult,
  MarketSortOption,
  SavedMarketFilterSummary,
} from "@/features/market/discovery-types"
import { requireUser } from "@/lib/auth/session"

export async function searchMarketAssetsAction(
  filters: MarketFilters,
  sort: MarketSortOption,
  page: number,
  pageSize: number
): Promise<MarketSearchResult> {
  return searchMarketAssets(filters, sort, page, pageSize)
}

export async function getAllSectorsAction(): Promise<string[]> {
  return getAllSectors()
}

export interface SavedFilterActionResult {
  ok: boolean
  error?: string
}

export async function getSavedMarketFiltersAction(): Promise<SavedMarketFilterSummary[]> {
  const profile = await requireUser()
  return getSavedMarketFilters(profile.id)
}

export async function saveMarketFilterAction(
  name: string,
  filters: MarketFilters,
  sort: MarketSortOption
): Promise<SavedFilterActionResult> {
  const trimmed = name.trim()
  if (trimmed.length === 0) return { ok: false, error: "Informe um nome para o filtro." }
  if (trimmed.length > 60) return { ok: false, error: "Nome muito longo (máximo 60 caracteres)." }

  const profile = await requireUser()
  try {
    await saveMarketFilter(profile.id, trimmed, filters, sort)
  } catch {
    return { ok: false, error: "Não foi possível salvar o filtro." }
  }

  revalidatePath("/mercado")
  return { ok: true }
}

export async function deleteMarketFilterAction(id: string): Promise<SavedFilterActionResult> {
  const profile = await requireUser()
  try {
    await deleteMarketFilter(profile.id, id)
  } catch {
    return { ok: false, error: "Não foi possível remover o filtro." }
  }

  revalidatePath("/mercado")
  return { ok: true }
}
