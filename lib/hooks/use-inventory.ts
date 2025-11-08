"use client"

import useSWR from "swr"
import { api } from "@/lib/config/api"
import type { InventoryItem, Movement } from "@/lib/types"

export function useInventoryByWarehouse(warehouseId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<InventoryItem[]>(
    warehouseId ? `/api/inventory/warehouse/${warehouseId}` : null,
    async (url: string) => {
      const response = await api.get(url)
      // Map backend fields (snake_case / nested) to frontend-friendly camelCase
      const payload = Array.isArray(response) ? response : (response?.data || [])
      return (payload || []).map((item: any) => {
        // Normalize identifiers
        const productId = item.product_id || item.productId || item.product?.id
        const warehouseId = item.warehouse_id || item.warehouseId || item.warehouse?.id

        // Extract lot number if stored in a notes field (e.g. "Lote: XYZ")
        let lotNumber: string | undefined = undefined
        if (item.lot_number) lotNumber = item.lot_number
        else if (item.lotNumber) lotNumber = item.lotNumber
        else if (item.notes && typeof item.notes === "string") {
          const m = item.notes.match(/Lote:\s*(.+)/i)
          if (m) lotNumber = m[1].trim()
        }

        return {
          // keep original payload for any extra fields
          ...item,
          id: item.id,
          productId,
          warehouseId,
          currentStock: item.quantity !== undefined ? Number(item.quantity) : 0,
          location: item.location_code || item.locationCode || item.location || null,
          reservedQuantity: item.reserved_quantity !== undefined ? Number(item.reserved_quantity) : 0,
          lotNumber,
        }
      })
    },
  )

  return {
    inventory: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useLowStockProducts(warehouseId?: string) {
  const { data, error, isLoading } = useSWR<InventoryItem[]>(
    warehouseId ? `/inventory/low-stock?warehouseId=${warehouseId}` : "/inventory/low-stock",
  async (url: string) => {
  const response = await api.get(url)
  return Array.isArray(response) ? response : response?.data
    },
  )

  return {
    lowStockProducts: data || [],
    isLoading,
    isError: error,
  }
}

export function useMovements(filters?: {
  warehouseId?: string
  type?: string
  startDate?: string
  endDate?: string
}) {
  const params = new URLSearchParams()
  if (filters?.warehouseId) params.append("warehouseId", filters.warehouseId)
  if (filters?.type) params.append("type", filters.type)
  if (filters?.startDate) params.append("startDate", filters.startDate)
  if (filters?.endDate) params.append("endDate", filters.endDate)

  const { data, error, isLoading, mutate } = useSWR<Movement[]>(
    `/api/inventory/movements?${params.toString()}`,
    async (url: string) => {
      const response = await api.get(url)
      const payload = Array.isArray(response) ? response : response?.data || []

      // Normalize movements so the UI can rely on fields like userName, lotNumber and total
      return (payload || []).map((m: any) => {
        const items = (m.items || []).map((it: any) => ({
          ...it,
          quantity: it.quantity !== undefined ? Number(it.quantity) : 0,
          cost: it.cost !== undefined ? Number(it.cost) : 0,
        }))

        // Extract lot number from first item notes if available
        let lotNumber: string | undefined = undefined
        if (m.lotNumber) lotNumber = m.lotNumber
        else if (m.reference) lotNumber = m.reference
        else if (items[0]?.notes && typeof items[0].notes === "string") {
          const mm = items[0].notes.match(/Lote:\s*(.+)/i)
          if (mm) lotNumber = mm[1].trim()
        }

        const total = items.reduce((acc: number, it: any) => acc + (Number(it.cost || 0) * Number(it.quantity || 0)), 0)

        return {
          ...m,
          items,
          lotNumber,
          userName: m.createdBy || m.created_by || m.userName || undefined,
          total: total > 0 ? total : undefined,
        }
      })
    },
  )

  return {
    movements: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useMovementById(id: string | null) {
  const { data, error, isLoading } = useSWR<Movement>(id ? `/inventory/movements/${id}` : null, async (url: string) => {
    const response = await api.get(url)
    return response
  })

  return {
    movement: data,
    isLoading,
    isError: error,
  }
}

// Actions
export async function createMovement(data: {
  type: "entrada" | "salida" | "ajuste" | "traspaso"
  warehouseId: string
  locationId?: string
  referenceType?: string
  referenceId?: string
  referenceNumber?: string
  notes?: string
  items: Array<{
    productId: string
    quantity: number
    // backend accepts only productId, quantity, locationId, notes for each item
    unitId?: string
    fromLocationId?: string
    toLocationId?: string
    lotNumber?: string
    unitCost?: number
  }>
}) {
  // Map frontend payload to backend DTO: backend expects items with productId, quantity, locationId, notes
  const payload: any = {
    type: data.type,
    warehouseId: data.warehouseId,
    destinationWarehouseId: (data as any).destinationWarehouseId,
    reference: (data as any).reference || (data as any).referenceNumber || undefined,
    notes: data.notes,
    items: data.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      locationId: (it as any).fromLocationId || (it as any).locationId || undefined,
      notes: (it as any).lotNumber ? `Lote: ${(it as any).lotNumber}` : undefined,
    })),
  }

  const response = await api.post("/api/inventory/movements", payload)
  return response
}

export async function updateInventoryStock(data: {
  productId: string
  warehouseId: string
  locationId?: string
  minStock?: number
  maxStock?: number
  reorderPoint?: number
}) {
  // Cambia la ruta para incluir /api/
  const response = await api.patch(`/api/inventory/${data.productId}`, data)
  return response.data
}
