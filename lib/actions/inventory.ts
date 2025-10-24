"use server"

import { supabase, handleSupabaseError } from "@/lib/db/supabase"
import { revalidatePath } from "next/cache"

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
    return { data: null, error: error.message }
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
    return { data: null, error: error.message }
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
    return { data: null, error: error.message }
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
    return { data: null, error: error.message }
  }
}
