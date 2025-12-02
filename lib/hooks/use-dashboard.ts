"use client"

import useSWR from "swr"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"

export function useDashboardKPIs() {
  const { data, error, isLoading, mutate } = useSWR("dashboard-kpis", async () => {
    const response = await ApiClient.get(API_ENDPOINTS.dashboard.kpis())
    return response
  })

  return {
    kpis: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useProfitReport() {
  const { data, error, isLoading, mutate } = useSWR("profit-report", async () => {
    const response = await ApiClient.get(API_ENDPOINTS.dashboard.profitReport())
    return response
  })

  return {
    profitReport: data,
    isLoading,
    isError: error,
    mutate,
  }
}
