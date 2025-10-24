"use server"

import { apiGet, apiPost, apiPatch } from "@/lib/db/localApi"
import { revalidatePath } from "next/cache"
import type { Producer, InputAssignment, FruitReception, Shipment } from "@/lib/types"

export async function getProducers() {
  try {
    const data = await apiGet("/producers?is_active=true&order=name")
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function createProducer(producer: Partial<Producer>) {
  try {
    const data = await apiPost("/producers", {
      code: producer.code,
      name: producer.name,
      email: producer.email,
      phone: producer.phone,
      address: producer.address,
      taxId: (producer as any).taxId || (producer as any).rfc || undefined,
    })

    revalidatePath("/producers")
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function createInputAssignment(
  assignment: Partial<InputAssignment>,
  items: Array<{ productId: string; quantity: number; unitPrice: number }>,
) {
  try {
    const assignmentNumber = `IA-${Date.now()}`

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const tax = subtotal * 0.16
    const total = subtotal + tax

    // Insert assignment
    const assignmentData = await apiPost("/input-assignments", {
      assignment_number: assignmentNumber,
      producer_id: assignment.producerId,
      warehouse_id: assignment.warehouseId,
      assignment_date: assignment.assignmentDate || new Date().toISOString(),
      subtotal,
      tax,
      total,
      notes: assignment.notes,
    })

    const itemsToInsert = items.map((item) => ({
      assignment_id: assignmentData.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.quantity * item.unitPrice,
      tax: item.quantity * item.unitPrice * 0.16,
      total: item.quantity * item.unitPrice * 1.16,
    }))

    await apiPost("/input_assignment_items", itemsToInsert)

    // Create account movement via backend
    await apiPost("/producer_account_movements", [
      {
        producer_id: assignment.producerId,
        type: "asignacion",
        amount: -total,
        balance: null,
        reference_type: "assignment",
        reference_id: assignmentData.id,
        reference_number: assignmentNumber,
        description: `Asignación de insumos ${assignmentNumber}`,
        date: new Date().toISOString(),
      },
    ])

    revalidatePath("/producers")
    return { data: assignmentData, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function createFruitReception(reception: Partial<FruitReception>) {
  try {
    const receptionNumber = `FR-${Date.now()}`
    const data = await apiPost("/fruit-receptions", {
      reception_number: receptionNumber,
      producer_id: reception.producerId,
      warehouse_id: reception.warehouseId,
      reception_date: reception.receptionDate || new Date().toISOString(),
      product_id: reception.productId,
      boxes: reception.boxes,
      weight_per_box: reception.weightPerBox,
      total_weight: reception.totalWeight,
      shipment_status: "pendiente",
      notes: reception.notes,
    })

    revalidatePath("/producers")
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function createShipment(receptionIds: string[], shipmentData: Partial<Shipment>) {
  try {
    const shipmentNumber = `SH-${Date.now()}`
    // Get receptions data
    const receptions = await apiGet(`/fruit-receptions?in=id,${receptionIds.join(",")}`)

    const totalBoxes = receptions?.reduce((sum: any, r: any) => sum + r.boxes, 0) || 0

    // Create shipment
    const shipment = await apiPost("/shipments", {
      shipment_number: shipmentNumber,
      status: "embarcada",
      total_boxes: totalBoxes,
      carrier: shipmentData.carrier,
      carrier_contact: shipmentData.carrierContact,
      shipment_date: shipmentData.shipmentDate || new Date().toISOString(),
      notes: shipmentData.notes,
    })

    // Create shipment items
    const shipmentItems = receptions?.map((r: any) => ({
      shipment_id: shipment.id,
      reception_id: r.id,
      producer_id: r.producer_id,
      boxes: r.boxes,
    }))

    await apiPost("/shipment_items", shipmentItems)

    // Update receptions status
    await apiPatch(`/fruit-receptions`, { filters: [{ field: "id", op: "in", value: receptionIds }], payload: { shipment_status: "embarcada", shipment_id: shipment.id } })

    revalidatePath("/producers")
    return { data: shipment, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function markShipmentAsSold(shipmentId: string, salePrice: number) {
  try {
    // Get shipment items
    const items = await apiGet(`/shipment_items?eq=shipment_id,${shipmentId}&select=*,reception:fruit_receptions(producer_id)`)

    // Calculate sale amounts for each item
    const updates = (items as any[] | undefined)?.map((item: any) => ({
      id: item.id,
      sale_amount: item.boxes * salePrice,
    }))

    // Update shipment items with sale amounts
    for (const update of updates || []) {
      await apiPatch(`/shipment_items/${update.id}`, { sale_amount: update.sale_amount })
    }

    // Calculate total
  const saleTotalAmount = (items as any[] | undefined)?.reduce((sum: number, item: any) => sum + item.boxes * salePrice, 0) || 0

    // Update shipment
    await apiPatch(`/shipments/${shipmentId}`, { status: "vendida", sale_price: salePrice, sale_total_amount: saleTotalAmount })

    // Create account movements for each producer
  const shipment = await apiGet(`/shipments?eq=id,${shipmentId}&select=shipment_number`)

    for (const item of items || []) {
      const saleAmount = item.boxes * salePrice
      await apiPost(`/producer_account_movements`, [
        {
          producer_id: item.reception.producer_id,
          type: "recepcion",
          amount: saleAmount,
          balance: null,
          reference_type: "shipment",
          reference_id: shipmentId,
          reference_number: shipment?.shipment_number || "",
          description: `Venta de embarque ${shipment?.shipment_number} - ${item.boxes} cajas a $${salePrice}`,
          date: new Date().toISOString(),
        },
      ])
    }

    // Update fruit receptions status
    const receptionIds = items?.map((item: any) => item.reception_id) || []
    await apiPatch(`/fruit-receptions`, { filters: [{ field: "id", op: "in", value: receptionIds }], payload: { shipment_status: "vendida" } })

    revalidatePath("/producers")
    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function getProducerAccountMovements(producerId: string) {
  try {
    const data = await apiGet(`/producer_account_movements?eq=producer_id,${producerId}&order=date.desc`)
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function registerProducerPayment(payment: {
  producerId: string
  amount: number
  paymentMethod: string
  reference?: string
  evidenceUrl?: string
  notes?: string
}) {
  try {
    const paymentNumber = `PP-${Date.now()}`

    // Insert payment
    const paymentData = await apiPost(`/producer_payments`, {
      payment_number: paymentNumber,
      producer_id: payment.producerId,
      payment_date: new Date().toISOString(),
      amount: payment.amount,
      payment_method: payment.paymentMethod,
      reference: payment.reference,
      evidence_url: payment.evidenceUrl,
      notes: payment.notes,
    })

    await apiPost(`/producer_account_movements`, [
      {
        producer_id: payment.producerId,
        type: "pago",
        amount: -payment.amount,
        balance: null,
        reference_type: "payment",
        reference_id: paymentData.id,
        reference_number: paymentNumber,
        description: `Pago ${paymentNumber} - ${payment.paymentMethod}`,
        date: new Date().toISOString(),
      },
    ])

    revalidatePath("/producers")
    return { data: paymentData, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}
