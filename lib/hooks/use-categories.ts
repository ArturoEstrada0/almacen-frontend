"use client"

import useSWR from "swr"
import { apiGet } from "@/lib/db/localApi"

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR("categories", async () => {
    const data = await apiGet("/categories?is_active=true&order=name")
    return data
  })

  return {
    categories: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}
