"use client"

import useSWR from "swr"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import type { Quotation } from "@/lib/types"

export function useQuotations() {
  const { data, error, isLoading, mutate } = useSWR<Quotation[]>("quotations", () =>
    ApiClient.get<Quotation[]>(API_ENDPOINTS.quotations.list()),
  )

  return {
    quotations: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useQuotation(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Quotation>(id ? `quotation-${id}` : null, () =>
    ApiClient.get<Quotation>(API_ENDPOINTS.quotations.get(id as string)),
  )

  return {
    quotation: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export interface CreateQuotationData {
  description?: string
  validUntil: string
  notes?: string
  items: { productId: string; quantity: number; notes?: string }[]
  supplierIds: string[]
}

export async function createQuotation(data: CreateQuotationData) {
  return ApiClient.post<Quotation>(API_ENDPOINTS.quotations.create(), data)
}

export async function markQuotationWinner(id: string, supplierId: string) {
  return ApiClient.post<Quotation>(API_ENDPOINTS.quotations.markWinner(id, supplierId), {})
}
