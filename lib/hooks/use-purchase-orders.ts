"use client"

import useSWR from "swr"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import type { PurchaseOrder } from "@/lib/types"

export interface ShipmentPayableEntry {
  id: string
  shipmentId: string
  shipmentCode: string
  trackingFolio?: string | null
  partyName: string
  amount: number
  paidAmount: number
  pendingAmount: number
  paymentStatus: "pendiente" | "parcial" | "pagado"
  shipmentDate?: string | null
  documentUrl?: string | null
  documentRegisteredAt?: string | null
  documents?: Array<{ label: string; url: string }>
}

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

export function useShipmentPayables() {
  const { data, error, isLoading, mutate } = useSWR<ShipmentPayableEntry[]>("shipment-payables", () =>
    ApiClient.get<ShipmentPayableEntry[]>(API_ENDPOINTS.accounting.shipmentPayables()),
  )

  return {
    shipmentPayables: data || [],
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

export async function registerPayment(orderId: string, data: {
  amount: number
  paymentMethod?: string
  reference?: string
  notes?: string
}) {
  return ApiClient.post<PurchaseOrder>(API_ENDPOINTS.purchaseOrders.registerPayment(orderId), data)
}

export async function registerShipmentPayablePayment(entryId: string, data: {
  amount: number
  paymentMethod?: string
  reference?: string
  notes?: string
}) {
  return ApiClient.post<ShipmentPayableEntry>(API_ENDPOINTS.accounting.registerShipmentPayablePayment(entryId), data)
}

export async function updatePurchaseOrder(id: string, data: any) {
  return ApiClient.patch<PurchaseOrder>(API_ENDPOINTS.purchaseOrders.update(id), data)
}
