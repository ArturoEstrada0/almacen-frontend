"use client"

import useSWR from "swr"
import { apiGet } from "@/lib/db/localApi"

export function useProductTypes() {
  const { data, error, isLoading, mutate } = useSWR("product-types", async () => {
    const data = await apiGet("/product-catalog", { type: "productType", status: "active" })
    return Array.isArray(data)
      ? [...data]
          .map((typeItem: any) => ({
            id: typeItem.id,
            name: typeItem.name,
          }))
          .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), "es"))
      : []
  })

  return {
    productTypes: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}