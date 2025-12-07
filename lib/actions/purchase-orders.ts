"use server"

import { supabase, handleSupabaseError } from "@/lib/db/supabase"
import { revalidatePath } from "next/cache"
import type { PurchaseOrder, PurchaseOrderItem } from "@/lib/types"
import { extractErrorMessage } from "@/lib/utils/error-handler"

export async function getPurchaseOrders() {
  try {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        supplier:suppliers(id, business_name, code),
        warehouse:warehouses(id, name, code),
        items:purchase_order_items(
          *,
          product:products(id, sku, name)
        )
      `)
      .order("order_date", { ascending: false })

    if (error) handleSupabaseError(error)
    return { data, error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en getPurchaseOrders:', errorMessage)
    return { data: null, error: errorMessage }
  }
}

export async function getPurchaseOrderById(id: string) {
  try {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        supplier:suppliers(*),
        warehouse:warehouses(*),
        items:purchase_order_items(
          *,
          product:products(*)
        )
      `)
      .eq("id", id)
      .single()

    if (error) handleSupabaseError(error)
    return { data, error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en getPurchaseOrderById:', errorMessage)
    return { data: null, error: errorMessage }
  }
}

export async function createPurchaseOrder(order: Partial<PurchaseOrder>, items: Partial<PurchaseOrderItem>[]) {
  try {
    // Generate order number
    const orderNumber = `PO-${Date.now()}`

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
    const tax = items.reduce((sum, item) => sum + (item.tax || 0), 0)
    const total = subtotal + tax

    // Insert purchase order
    const { data: poData, error: poError } = await supabase
      .from("purchase_orders")
      .insert([
        {
          order_number: orderNumber,
          supplier_id: order.supplierId,
          warehouse_id: order.warehouseId,
          order_date: order.orderDate || new Date().toISOString(),
          expected_delivery_date: order.expectedDeliveryDate,
          status: "pendiente",
          payment_status: "pendiente",
          subtotal,
          tax,
          total,
          credit_days: order.creditDays || 0,
          due_date: order.dueDate,
          notes: order.notes,
        },
      ])
      .select()
      .single()

    if (poError) handleSupabaseError(poError)

    // Insert items
    const itemsToInsert = items.map((item) => ({
      purchase_order_id: poData.id,
      product_id: item.productId,
      quantity_ordered: item.quantity,
      unit_id: item.product?.unitOfMeasure,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
      tax: item.tax,
      total: item.total,
    }))

    const { error: itemsError } = await supabase.from("purchase_order_items").insert(itemsToInsert)

    if (itemsError) handleSupabaseError(itemsError)

    revalidatePath("/purchase-orders")
    return { data: poData, error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en createPurchaseOrder:', errorMessage)
    return { data: null, error: errorMessage }
  }
}

export async function receivePurchaseOrder(
  orderId: string,
  items: Array<{ id: string; quantityReceived: number; lotNumber?: string }>,
) {
  try {
    // Update received quantities
    for (const item of items) {
      const { error } = await supabase
        .from("purchase_order_items")
        .update({
          quantity_received: item.quantityReceived,
          lot_number: item.lotNumber,
        })
        .eq("id", item.id)

      if (error) handleSupabaseError(error)
    }

    // Check if all items are fully received
    const { data: orderItems } = await supabase
      .from("purchase_order_items")
      .select("quantity_ordered, quantity_received")
      .eq("purchase_order_id", orderId)

    const allReceived = orderItems?.every((item) => item.quantity_received >= item.quantity_ordered)
    const anyReceived = orderItems?.some((item) => item.quantity_received > 0)

    const newStatus = allReceived ? "completada" : anyReceived ? "parcial" : "pendiente"

    // Update order status
    const { error: orderError } = await supabase
      .from("purchase_orders")
      .update({
        status: newStatus,
        delivery_date: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (orderError) handleSupabaseError(orderError)

    // Create inventory movement
    // TODO: Implement movement creation

    revalidatePath("/purchase-orders")
    return { error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en receivePurchaseOrder:', errorMessage)
    return { error: errorMessage }
  }
}

export async function registerPayment(
  orderId: string,
  payment: {
    amount: number
    paymentMethod: string
    reference?: string
    notes?: string
  },
) {
  try {
    // Insert payment record
    const { error: paymentError } = await supabase.from("purchase_order_payments").insert([
      {
        purchase_order_id: orderId,
        payment_date: new Date().toISOString(),
        amount: payment.amount,
        payment_method: payment.paymentMethod,
        reference: payment.reference,
        notes: payment.notes,
      },
    ])

    if (paymentError) handleSupabaseError(paymentError)

    // Update order paid amount
    const { data: order } = await supabase
      .from("purchase_orders")
      .select("paid_amount, total")
      .eq("id", orderId)
      .single()

    const newPaidAmount = (order?.paid_amount || 0) + payment.amount
    const newPaymentStatus = newPaidAmount >= order?.total ? "pagado" : newPaidAmount > 0 ? "parcial" : "pendiente"

    const { error: updateError } = await supabase
      .from("purchase_orders")
      .update({
        paid_amount: newPaidAmount,
        payment_status: newPaymentStatus,
      })
      .eq("id", orderId)

    if (updateError) handleSupabaseError(updateError)

    revalidatePath("/purchase-orders")
    return { error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en registerPayment:', errorMessage)
    return { error: errorMessage }
  }
}
