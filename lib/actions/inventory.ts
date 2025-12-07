"use server"

import { supabase, handleSupabaseError } from "@/lib/db/supabase"
import { revalidatePath } from "next/cache"
import { extractErrorMessage } from "@/lib/utils/error-handler"

export async function getInventoryByWarehouse(warehouseId: string) {
  try {
    const { data, error } = await supabase
      .from("inventory")
      .select(`
        *,
        product:products(id, sku, name, type, cost_price),
        warehouse:warehouses(id, name, code),
        location:locations(id, code, name)
      `)
      .eq("warehouse_id", warehouseId)
      .order("product(name)")

    if (error) handleSupabaseError(error)
    return { data, error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en getInventoryByWarehouse:', errorMessage)
    return { data: null, error: errorMessage }
  }
}

export async function updateInventoryLevels(
  productId: string,
  warehouseId: string,
  levels: { minStock: number; maxStock: number; reorderPoint: number },
) {
  try {
    const { data, error } = await supabase
      .from("inventory")
      .update({
        min_stock: levels.minStock,
        max_stock: levels.maxStock,
        reorder_point: levels.reorderPoint,
      })
      .eq("product_id", productId)
      .eq("warehouse_id", warehouseId)
      .select()

    if (error) handleSupabaseError(error)

    revalidatePath("/inventory")
    return { data, error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en updateInventoryLevels:', errorMessage)
    return { data: null, error: errorMessage }
  }
}

export async function createInventoryEntry(
  productId: string,
  warehouseId: string,
  levels: { minStock: number; maxStock: number; reorderPoint: number },
) {
  try {
    const { data, error } = await supabase
      .from("inventory")
      .insert([
        {
          product_id: productId,
          warehouse_id: warehouseId,
          quantity_available: 0,
          min_stock: levels.minStock,
          max_stock: levels.maxStock,
          reorder_point: levels.reorderPoint,
        },
      ])
      .select()

    if (error) handleSupabaseError(error)

    revalidatePath("/inventory")
    return { data, error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en createInventoryEntry:', errorMessage)
    return { data: null, error: errorMessage }
  }
}

export async function getLowStockProducts(warehouseId?: string) {
  try {
    let query = supabase
      .from("inventory")
      .select(`
        *,
        product:products(id, sku, name, type),
        warehouse:warehouses(id, name)
      `)
      .lte("quantity_available", supabase.raw("min_stock"))

    if (warehouseId) {
      query = query.eq("warehouse_id", warehouseId)
    }

    const { data, error } = await query.order("quantity_available")

    if (error) handleSupabaseError(error)
    return { data, error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en getLowStockProducts:', errorMessage)
    return { data: null, error: errorMessage }
  }
}
