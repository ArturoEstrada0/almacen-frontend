"use client"

import useSWR from "swr"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import type { Warehouse } from "@/lib/types"

export function useWarehouses() {
  const { data, error, isLoading, mutate } = useSWR<Warehouse[]>("warehouses", () =>
    ApiClient.get<Warehouse[]>(API_ENDPOINTS.warehouses.list()),
  )

  return {
    warehouses: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useWarehouse(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Warehouse>(id ? `warehouse-${id}` : null, () =>
    ApiClient.get<Warehouse>(API_ENDPOINTS.warehouses.get(id)),
  )

  return {
    warehouse: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useLocations(warehouseId?: string) {
  const { data, error, isLoading, mutate } = useSWR<Location[]>(
    warehouseId ? `locations-${warehouseId}` : "locations",
    () => ApiClient.get<Location[]>(API_ENDPOINTS.warehouses.locations.list()),
  )

  return {
    locations: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export async function createWarehouse(data: Partial<Warehouse> & Record<string, any>) {
  // backend expects `address` (CreateWarehouseDto), but some frontend code previously used `location`.
  // Normalize both to `address` to avoid validation errors (forbidNonWhitelisted).
  const payload = {
    ...data,
    address: data.address ?? data.location,
  }

  // Remove legacy `location` key to avoid NestJS whitelist errors
  if (payload.location) delete payload.location

  return ApiClient.post<Warehouse>(API_ENDPOINTS.warehouses.create(), payload)
}

export async function updateWarehouse(id: string, data: Partial<Warehouse>) {
  return ApiClient.patch<Warehouse>(API_ENDPOINTS.warehouses.update(id), data)
}

export async function deleteWarehouse(id: string) {
  return ApiClient.delete(API_ENDPOINTS.warehouses.delete(id))
}

export async function createLocation(data: Partial<Location>) {
  return ApiClient.post<Location>(API_ENDPOINTS.warehouses.locations.create(), data)
}
