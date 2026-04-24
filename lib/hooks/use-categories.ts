"use client"

import useSWR from "swr"
import { apiGet } from "@/lib/db/localApi"

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR("categories", async () => {
    const data = await apiGet("/product-catalog", { type: "category", status: "active" })
    return Array.isArray(data)
      ? [...data]
          .map((category: any) => ({
            id: category.id,
            name: category.name,
          }))
          .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), "es"))
      : []
  })

  return {
    categories: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}
