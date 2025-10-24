"use client"

import useSWR from "swr"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import type { PurchaseOrder } from "@/lib/types"

export function usePurchaseOrders() {
  const { data, error, isLoading, mutate } = useSWR<PurchaseOrder[]>("purchase-orders", () =>
    ApiClient.get<PurchaseOrder[]>(API_ENDPOINTS.purchaseOrders.list()),
  )

  return {
    purchaseOrders: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function usePurchaseOrder(id: string) {
  const { data, error, isLoading, mutate } = useSWR<PurchaseOrder>(id ? `purchase-order-${id}` : null, () =>
    ApiClient.get<PurchaseOrder>(API_ENDPOINTS.purchaseOrders.get(id)),
  )

  return {
    purchaseOrder: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export async function createPurchaseOrder(data: any) {
  return ApiClient.post<PurchaseOrder>(API_ENDPOINTS.purchaseOrders.create(), data)
}

export async function receivePurchaseOrder(orderId: string, itemId: string, quantity: number) {
  return ApiClient.patch<PurchaseOrder>(API_ENDPOINTS.purchaseOrders.receive(orderId, itemId), { quantity })
}

export async function cancelPurchaseOrder(id: string) {
  return ApiClient.patch<PurchaseOrder>(API_ENDPOINTS.purchaseOrders.cancel(id), {})
}
