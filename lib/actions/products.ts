"use server"

import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/db/localApi"
import { revalidatePath } from "next/cache"
import type { Product } from "@/lib/types"

export async function getProducts() {
  try {
    const data = await apiGet(`/products?is_active=true&order=name&select=*,category:categories(id,name),unit:units(id,name,abbreviation)`)
    // Map backend fields to frontend Product shape
    const mapped = (data || []).map((p: any) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description || "",
      type: p.type,
      categoryId: p.categoryId || p.category_id || null,
      category: p.category || null,
      imageUrl: p.image || p.image_url || null,
      barcode: p.barcode || null,
      unitOfMeasure: p.unit ? p.unit.name : (p.unitId || p.unit_id) || "",
      costPrice: p.cost !== undefined ? Number(p.cost) : 0,
      salePrice: p.price !== undefined ? Number(p.price) : 0,
      minStock: 0,
      maxStock: 0,
      reorderPoint: 0,
      isActive: p.active !== undefined ? Boolean(p.active) : (p.is_active !== undefined ? Boolean(p.is_active) : true),
      createdAt: p.createdAt || p.created_at,
      updatedAt: p.updatedAt || p.updated_at,
    }))
    return { data: mapped, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function getProductById(id: string) {
  try {
    const p = await apiGet(`/products/${id}?select=*,category:categories(id,name),unit:units(id,name,abbreviation)`)
    if (!p) return { data: null, error: null }
    const data = {
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description || "",
      type: p.type,
      categoryId: p.categoryId || p.category_id || null,
      category: p.category || null,
      imageUrl: p.image || p.image_url || null,
      barcode: p.barcode || null,
      unitOfMeasure: p.unit ? p.unit.name : (p.unitId || p.unit_id) || "",
      costPrice: p.cost !== undefined ? Number(p.cost) : 0,
      salePrice: p.price !== undefined ? Number(p.price) : 0,
      minStock: 0,
      maxStock: 0,
      reorderPoint: 0,
      isActive: p.active !== undefined ? Boolean(p.active) : (p.is_active !== undefined ? Boolean(p.is_active) : true),
      createdAt: p.createdAt || p.created_at,
      updatedAt: p.updatedAt || p.updated_at,
    }
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function createProduct(product: Partial<Product>) {
  try {
    // Validate and sanitize payload
    const isUUID = (v: any) => typeof v === "string" && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v)
    const payload: any = {
      sku: product.sku,
      name: product.name,
      description: product.description || undefined,
      type: (product.type === "fruta" ? "fruta" : "insumo"),
      // backend expects `cost` and `price`
      cost: product.costPrice !== undefined ? Number(product.costPrice) : undefined,
      price: product.salePrice !== undefined ? Number(product.salePrice) : undefined,
      barcode: product.barcode || undefined,
      image: product.imageUrl || undefined,
      active: product.isActive !== undefined ? Boolean(product.isActive) : true,
    }
    if (isUUID(product.categoryId)) payload.categoryId = product.categoryId
    if (product.unitOfMeasure && typeof product.unitOfMeasure === "string" && isUUID((product as any).unitId)) payload.unitId = (product as any).unitId

    const res = await apiPost(`/products`, payload)
    revalidatePath("/products")
    return { data: res, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function updateProduct(id: string, product: Partial<Product>) {
  try {
    const data = await apiPatch(`/products/${id}`, {
      sku: product.sku,
      name: product.name,
      description: product.description,
      type: product.type,
      category_id: product.categoryId,
      unit_id: product.unitOfMeasure,
      barcode: product.barcode,
      image_url: product.imageUrl,
      cost_price: product.costPrice,
      sale_price: product.salePrice,
    })

    revalidatePath("/products")
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function deleteProduct(id: string) {
  try {
    await apiPatch(`/products/${id}`, { is_active: false })

    revalidatePath("/products")
    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function getProductsByType(type: "insumo" | "fruta") {
  try {
    const data = await apiGet(`/products?type=${type}&is_active=true&order=name&select=*,category:categories(id,name),unit:units(id,name,abbreviation)`)
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}
