"use client"

import useSWR from "swr"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"

export interface TraceabilityEvent {
  id: string
  entityType: string
  entityId: string
  action: string
  userId?: string
  userName?: string
  reason?: string
  details?: string
  result: string
  createdAt: string
}

export function useTraceability(entityType: string, entityId?: string | null) {
  const key = entityType && entityId ? `traceability-${entityType}-${entityId}` : null
  const { data, error, isLoading, mutate } = useSWR<TraceabilityEvent[]>(key, () =>
    ApiClient.get<TraceabilityEvent[]>(API_ENDPOINTS.traceability.byEntity(entityType, entityId as string)),
  )

  return {
    events: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}