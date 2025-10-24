"use client"

import useSWR from "swr"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import type { Product } from "@/lib/types"

function mapBackendProduct(p: any): Product {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description || "",
    type: p.type,
    categoryId: p.categoryId || p.category_id || null,
    category: p.category || null,
    imageUrl: p.image || p.image_url || null,
    barcode: p.barcode || null,
    unitOfMeasure: p.unit ? p.unit.name : p.unitId || p.unit_id || "",
    costPrice: p.cost !== undefined ? Number(p.cost) : 0,
    salePrice: p.price !== undefined ? Number(p.price) : 0,
    minStock: 0,
    maxStock: 0,
    reorderPoint: 0,
    isActive:
      p.active !== undefined ? Boolean(p.active) : p.is_active !== undefined ? Boolean(p.is_active) : true,
    createdAt: p.createdAt || p.created_at,
    updatedAt: p.updatedAt || p.updated_at,
  }
}

export function useProducts() {
  const { data, error, isLoading, mutate } = useSWR<any[]>("products", async () =>
    ApiClient.get<any[]>(API_ENDPOINTS.products.list()),
  )

  const mapped = (data || []).map(mapBackendProduct)

  return {
    products: mapped,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useProductsByType(type: "insumo" | "fruta") {
  const { data, error, isLoading, mutate } = useSWR<any[]>(`products-${type}`, async () => {
    const products = await ApiClient.get<any[]>(API_ENDPOINTS.products.list())
    return products.filter((p) => p.type === type).map(mapBackendProduct)
  })

  return {
    products: (data as any[]) || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useProduct(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<any>(id ? `product-${id}` : null, async () =>
    ApiClient.get<any>(API_ENDPOINTS.products.get(id as string)),
  )

  return {
    product: data ? mapBackendProduct(data) : undefined,
    isLoading,
    isError: error,
    mutate,
  }
}

export async function createProduct(data: Partial<Product>) {
  // backend expects cost and price fields
  const payload: any = {
    ...data,
    cost: (data as any).costPrice,
    price: (data as any).salePrice,
    // map frontend boolean field to backend `active`
    active: (data as any).isActive !== undefined ? (data as any).isActive : (data as any).active,
  }
  delete payload.costPrice
  delete payload.salePrice
  // remove frontend-only fields that backend DTO doesn't accept
  delete payload.unitOfMeasure
  delete payload.isActive
  return ApiClient.post<any>(API_ENDPOINTS.products.create(), payload)
}

export async function updateProduct(id: string, data: Partial<Product>) {
  const payload: any = {
    ...data,
    cost: (data as any).costPrice,
    price: (data as any).salePrice,
    active: (data as any).isActive !== undefined ? (data as any).isActive : (data as any).active,
  }
  delete payload.costPrice
  delete payload.salePrice
  delete payload.unitOfMeasure
  delete payload.isActive
  return ApiClient.patch<any>(API_ENDPOINTS.products.update(id), payload)
}

export async function deleteProduct(id: string) {
  return ApiClient.patch(API_ENDPOINTS.products.delete(id), { is_active: false })
}
