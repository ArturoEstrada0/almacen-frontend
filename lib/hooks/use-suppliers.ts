"use client"

import useSWR from "swr"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import type { Supplier } from "@/lib/types"

export function useSuppliers() {
  const { data, error, isLoading, mutate } = useSWR<Supplier[]>("suppliers", () =>
    ApiClient.get<Supplier[]>(API_ENDPOINTS.suppliers.list()),
  )

  return {
    suppliers: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useSupplier(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Supplier>(id ? `supplier-${id}` : null, () =>
    ApiClient.get<Supplier>(API_ENDPOINTS.suppliers.get(id)),
  )

  return {
    supplier: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export async function createSupplier(data: Partial<Supplier>) {
  return ApiClient.post<Supplier>(API_ENDPOINTS.suppliers.create(), data)
}

export async function updateSupplier(id: string, data: Partial<Supplier>) {
  return ApiClient.patch<Supplier>(API_ENDPOINTS.suppliers.update(id), data)
}

export async function deleteSupplier(id: string) {
  return ApiClient.delete(API_ENDPOINTS.suppliers.delete(id))
}
