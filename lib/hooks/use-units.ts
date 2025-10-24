"use client"

import useSWR from "swr"
import { apiGet } from "@/lib/db/localApi"

export function useUnits() {
  const { data, error, isLoading, mutate } = useSWR("units", async () => {
    const data = await apiGet("/units?is_active=true&order=name")
    return data
  })

  return {
    units: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}
