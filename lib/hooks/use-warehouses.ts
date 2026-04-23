"use client"

import { useMemo } from "react"
import useSWR from "swr"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import type { Warehouse } from "@/lib/types"

function mapBackendWarehouse(warehouse: any): Warehouse {
  return {
    ...warehouse,
    id: warehouse.id,
    name: warehouse.name,
    code: warehouse.code,
    type: warehouse.type || "insumo",
    location: warehouse.location || warehouse.address || "",
    address: warehouse.address || warehouse.location || "",
    description: warehouse.description || "",
    isActive:
      warehouse.isActive !== undefined
        ? Boolean(warehouse.isActive)
        : warehouse.active !== undefined
          ? Boolean(warehouse.active)
          : true,
    active:
      warehouse.active !== undefined
        ? Boolean(warehouse.active)
        : warehouse.isActive !== undefined
          ? Boolean(warehouse.isActive)
          : true,
    createdAt: warehouse.createdAt || warehouse.created_at,
    updatedAt: warehouse.updatedAt || warehouse.updated_at,
  } as Warehouse
}

export function useWarehouses() {
  const { data, error, isLoading, mutate } = useSWR<any[]>("warehouses", () =>
    ApiClient.get<any[]>(API_ENDPOINTS.warehouses.list()),
  )

  const warehouses = useMemo(() => (data || []).map(mapBackendWarehouse), [data])

  return {
    warehouses,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useWarehouse(id: string) {
  const { data, error, isLoading, mutate } = useSWR<any>(id ? `warehouse-${id}` : null, () =>
    ApiClient.get<any>(API_ENDPOINTS.warehouses.get(id)),
  )

  const warehouse = useMemo(() => (data ? mapBackendWarehouse(data) : undefined), [data])

  return {
    warehouse,
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
    active: data.active ?? data.isActive,
    type: data.type || "insumo",
    warehouseType: data.type || data.warehouseType,
  }

  // Remove legacy `location` key to avoid NestJS whitelist errors
  if (payload.location) delete payload.location

  return ApiClient.post<Warehouse>(API_ENDPOINTS.warehouses.create(), payload)
}

export async function updateWarehouse(id: string, data: Partial<Warehouse>) {
  const payload: any = {
    ...data,
    address: (data as any).address ?? (data as any).location,
    active: (data as any).active ?? (data as any).isActive,
    warehouseType: (data as any).type || (data as any).warehouseType,
  }

  if (payload.location) delete payload.location
  if (payload.isActive !== undefined) delete payload.isActive

  return ApiClient.patch<Warehouse>(API_ENDPOINTS.warehouses.update(id), payload)
}

export async function deleteWarehouse(id: string) {
  return ApiClient.delete(API_ENDPOINTS.warehouses.delete(id))
}

export async function createLocation(data: Partial<Location>) {
  return ApiClient.post<Location>(API_ENDPOINTS.warehouses.locations.create(), data)
}
