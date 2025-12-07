"use server"

import { apiGet, apiPost, apiPatch } from "@/lib/db/localApi"
import { revalidatePath } from "next/cache"
import type { Supplier } from "@/lib/types"
import { extractErrorMessage } from "@/lib/utils/error-handler"

export async function getSuppliers() {
  try {
    const data = await apiGet(`/suppliers?is_active=true&order=business_name`)
    return { data, error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en getSuppliers:', errorMessage)
    return { data: null, error: errorMessage }
  }
}

export async function getSupplierById(id: string) {
  try {
    const data = await apiGet(`/suppliers/${id}`)
    return { data, error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en getSupplierById:', errorMessage)
    return { data: null, error: errorMessage }
  }
}

export async function createSupplier(supplier: Partial<Supplier>) {
  try {
    const data = await apiPost(`/suppliers`, {
      code: supplier.code,
      business_name: supplier.businessName,
      rfc: supplier.rfc,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      state: supplier.state,
      postal_code: supplier.postalCode,
      country: supplier.country,
      business_type: supplier.businessType,
      payment_terms_days: supplier.creditDays,
      contact_name: supplier.contactName,
      is_active: true,
    })

    revalidatePath("/suppliers")
    return { data, error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en createSupplier:', errorMessage)
    return { data: null, error: errorMessage }
  }
}

export async function updateSupplier(id: string, supplier: Partial<Supplier>) {
  try {
    const data = await apiPatch(`/suppliers/${id}`, {
      code: supplier.code,
      business_name: supplier.businessName,
      rfc: supplier.rfc,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      state: supplier.state,
      postal_code: supplier.postalCode,
      country: supplier.country,
      business_type: supplier.businessType,
      payment_terms_days: supplier.creditDays,
      contact_name: supplier.contactName,
    })

    revalidatePath("/suppliers")
    return { data, error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en updateSupplier:', errorMessage)
    return { data: null, error: errorMessage }
  }
}

export async function getSuppliersByProduct(productId: string) {
  try {
    const data = await apiGet(`/product_suppliers?product_id=${productId}&is_active=true&select=*,supplier:suppliers(*)`)
    return { data, error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en getSuppliersByProduct:', errorMessage)
    return { data: null, error: errorMessage }
  }
}

export async function addProductSupplier(productSupplier: {
  productId: string
  supplierId: string
  supplierSku?: string
  supplierPrice: number
  leadTimeDays?: number
  minOrderQuantity?: number
  isPreferred?: boolean
}) {
  try {
    const data = await apiPost(`/product_suppliers`, {
      product_id: productSupplier.productId,
      supplier_id: productSupplier.supplierId,
      supplier_sku: productSupplier.supplierSku,
      supplier_price: productSupplier.supplierPrice,
      lead_time_days: productSupplier.leadTimeDays,
      min_order_quantity: productSupplier.minOrderQuantity,
      is_preferred: productSupplier.isPreferred || false,
      is_active: true,
    })

    revalidatePath("/products")
    revalidatePath("/suppliers")
    return { data, error: null }
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error)
    console.error('Error en addProductSupplier:', errorMessage)
    return { data: null, error: errorMessage }
  }
}
