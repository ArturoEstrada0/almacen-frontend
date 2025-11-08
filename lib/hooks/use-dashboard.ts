"use client"

import useSWR from "swr"
import { api } from "@/lib/config/api"

export function useDashboardKPIs() {
  const { data, error, isLoading, mutate } = useSWR("dashboard-kpis", async () => {
    const response = await api.get("/api/dashboard/kpis")
    return response?.data || response
  })

  return {
    kpis: data,
    isLoading,
    isError: error,
    mutate,
  }
}
