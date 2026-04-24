"use client"

import useSWR from "swr"
import { apiGet } from "@/lib/db/localApi"

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR("categories", async () => {
    const [categoriesData, activeCatalogData] = await Promise.all([
      apiGet("/categories"),
      apiGet("/product-catalog", { type: "category", status: "active" }),
    ])

    const categories = Array.isArray(categoriesData) ? categoriesData : []
    const activeCatalog = Array.isArray(activeCatalogData) ? activeCatalogData : []
    const activeCatalogNames = new Set(
      activeCatalog.map((item: any) => String(item?.name || "").trim().toLowerCase()).filter(Boolean),
    )

    return [...categories]
      .filter((category: any) => {
        const normalizedName = String(category?.name || "").trim().toLowerCase()
        return normalizedName ? activeCatalogNames.has(normalizedName) : false
      })
      .map((category: any) => ({
        id: category.id,
        name: category.name,
      }))
      .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), "es"))
  })

  return {
    categories: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}
