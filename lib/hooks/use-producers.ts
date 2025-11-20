"use client"

import useSWR from "swr"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import type { Producer, InputAssignment, FruitReception, Shipment } from "@/lib/types"

export function useProducers() {
  const { data, error, isLoading, mutate } = useSWR<Producer[]>("producers", () =>
    ApiClient.get<Producer[]>(API_ENDPOINTS.producers.list()),
  )

  return {
    producers: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useProducer(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Producer>(id ? `producer-${id}` : null, () =>
    ApiClient.get<Producer>(API_ENDPOINTS.producers.get(id)),
  )

  return {
    producer: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useInputAssignments() {
  const { data, error, isLoading, mutate } = useSWR<InputAssignment[]>("input-assignments", () =>
    ApiClient.get<InputAssignment[]>(API_ENDPOINTS.producers.inputAssignments.list()),
  )

  return {
    inputAssignments: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useFruitReceptions() {
  const { data, error, isLoading, mutate } = useSWR<FruitReception[]>("fruit-receptions", () =>
    ApiClient.get<FruitReception[]>(API_ENDPOINTS.producers.fruitReceptions.list()),
  )

  return {
    fruitReceptions: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useShipments() {
  const { data, error, isLoading, mutate } = useSWR<Shipment[]>("shipments", () =>
    ApiClient.get<Shipment[]>(API_ENDPOINTS.producers.shipments.list()),
  )

  return {
    shipments: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useProducerAccountStatement(producerId: string) {
  const { data, error, isLoading, mutate } = useSWR(producerId ? `producer-account-${producerId}` : null, () =>
    ApiClient.get(API_ENDPOINTS.producers.accountStatement(producerId)),
  )

  return {
    accountStatement: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export async function createProducer(data: Partial<Producer>) {
  return ApiClient.post<Producer>(API_ENDPOINTS.producers.create(), data)
}

export async function createInputAssignment(data: any) {
  return ApiClient.post<InputAssignment>(API_ENDPOINTS.producers.inputAssignments.create(), data)
}

export async function createFruitReception(data: any) {
  return ApiClient.post<FruitReception>(API_ENDPOINTS.producers.fruitReceptions.create(), data)
}

export async function updateFruitReception(id: string, data: any) {
  return ApiClient.patch<FruitReception>(API_ENDPOINTS.producers.fruitReceptions.update(id), data)
}

export async function deleteFruitReception(id: string) {
  return ApiClient.delete(API_ENDPOINTS.producers.fruitReceptions.delete(id))
}

export async function createShipment(data: any) {
  return ApiClient.post<Shipment>(API_ENDPOINTS.producers.shipments.create(), data)
}

export async function updateShipment(id: string, data: any) {
  return ApiClient.patch<Shipment>(API_ENDPOINTS.producers.shipments.update(id), data)
}

export async function updateShipmentStatus(id: string, status: string, salePrice?: number) {
  return ApiClient.patch<Shipment>(API_ENDPOINTS.producers.shipments.updateStatus(id), { status, salePrice })
}

export async function deleteShipment(id: string) {
  return ApiClient.delete(API_ENDPOINTS.producers.shipments.delete(id))
}

export async function createPayment(data: any) {
  return ApiClient.post(API_ENDPOINTS.producers.payments.create(), data)
}
