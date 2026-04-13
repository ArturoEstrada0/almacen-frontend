"use client"

import { useState } from "react"
import { useAuth } from "@/lib/context/auth-context"

export interface Customer {
  id: string
  rfc: string
  name: string
  businessType?: string
  street: string
  streetNumber: string
  neighborhood?: string
  city: string
  state: string
  postalCode: string
  fullAddress?: string
  phone: string
  email: string
  contactName?: string
  paymentMethod: "cash" | "bank_transfer" | "check" | "credit"
  creditDays: number
  bankName?: string
  accountNumber?: string
  clabe?: string
  active: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CustomerReceivablePayment {
  id: string
  receivableId: string
  customerId: string
  paymentDate: string
  amount: number
  reference?: string
  invoiceFileUrl?: string
  invoiceUrl?: string
  evidenceUrl?: string
  capturedByUserId?: string
  capturedByUserName?: string
  notes?: string
  createdAt: string
}

export interface CustomerReceivable {
  id: string
  customerId: string
  invoiceNumber: string
  saleDate: string
  invoiceDate: string
  creditDays: number
  dueDate: string
  originalAmount: number
  paidAmount: number
  balanceAmount: number
  status: "pendiente" | "parcial" | "pagada" | "vencida"
  isOverdue?: boolean
  notes?: string
  createdByUserId?: string
  createdByUserName?: string
  lastPaymentAt?: string
  lastPaymentReference?: string
  payments?: CustomerReceivablePayment[]
  createdAt: string
  updatedAt: string
}

export interface CustomerAccountStatement {
  customer: Customer
  totals: {
    originalAmount: number
    paidAmount: number
    balanceAmount: number
    overdueCount: number
  }
  receivables: CustomerReceivable[]
}

export type CreateCustomerInput = Omit<Customer, "id" | "createdAt" | "updatedAt" | "active"> & {
  active?: boolean
}

export interface CreateCustomerReceivableInput {
  invoiceNumber: string
  saleDate: string
  invoiceDate: string
  creditDays?: number
  originalAmount: number
  notes?: string
}

export interface RegisterCustomerReceivablePaymentInput {
  paymentDate: string
  amount: number
  reference: string
  notes?: string
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/g, "")
const API_ROOT = API_BASE_URL.endsWith("/api") ? API_BASE_URL : `${API_BASE_URL}/api`

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { session } = useAuth()

  const fetchCustomers = async () => {
    if (!session?.access_token) return

    setIsLoading(true)
    setIsError(false)
    setError(null)

    try {
      const response = await fetch(`${API_ROOT}/customers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setCustomers(data)
    } catch (err: any) {
      setIsError(true)
      setError(err.message || "Error al obtener clientes")
      console.error("Error fetching customers:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const searchCustomers = async (query: string): Promise<Customer[]> => {
    if (!session?.access_token) return []

    try {
      const response = await fetch(`${API_ROOT}/customers/search?q=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (err: any) {
      console.error("Error searching customers:", err)
      return []
    }
  }

  const getCustomer = async (id: string): Promise<Customer | null> => {
    if (!session?.access_token) return null

    try {
      const response = await fetch(`${API_ROOT}/customers/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (err: any) {
      console.error("Error getting customer:", err)
      return null
    }
  }

  const createCustomer = async (data: CreateCustomerInput): Promise<Customer | null> => {
    if (!session?.access_token) return null

    try {
      console.debug("createCustomer request:", data)
      const response = await fetch(`${API_ROOT}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        let errorData: any = {}
        try {
          errorData = JSON.parse(text || "{}")
        } catch {
          errorData = { message: text }
        }
          console.error("createCustomer response error:", response.status, response.statusText, errorData)
          // Throw structured error so callers can inspect `errors`
          throw {
            message: errorData.message || text || `Error ${response.status}: ${response.statusText}`,
            status: response.status,
            errors: errorData.errors,
          }
      }

      const newCustomer = await response.json()
      setCustomers([...customers, newCustomer])
      return newCustomer
    } catch (err: any) {
      console.error("Error creating customer:", err)
      throw err
    }
  }

  const updateCustomer = async (id: string, data: Partial<Customer>): Promise<Customer | null> => {
    if (!session?.access_token) return null

    try {
      console.debug("updateCustomer request:", id, data)
      const response = await fetch(`${API_ROOT}/customers/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        let errorData: any = {}
        try {
          errorData = JSON.parse(text || "{}")
        } catch {
          errorData = { message: text }
        }
          console.error("updateCustomer response error:", response.status, response.statusText, errorData)
          // Throw structured error so callers can inspect `errors`
          throw {
            message: errorData.message || text || `Error ${response.status}: ${response.statusText}`,
            status: response.status,
            errors: errorData.errors,
          }
      }

      const updatedCustomer = await response.json()
      setCustomers(customers.map((c) => (c.id === id ? updatedCustomer : c)))
      return updatedCustomer
    } catch (err: any) {
      console.error("Error updating customer:", err)
      throw err
    }
  }

  const deleteCustomer = async (id: string): Promise<boolean> => {
    if (!session?.access_token) return false

    try {
      const response = await fetch(`${API_ROOT}/customers/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      setCustomers(customers.filter((c) => c.id !== id))
      return true
    } catch (err: any) {
      console.error("Error deleting customer:", err)
      throw err
    }
  }

  const toggleCustomerActive = async (id: string): Promise<Customer | null> => {
    if (!session?.access_token) return null

    try {
      const response = await fetch(`${API_ROOT}/customers/${id}/toggle-active`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const updatedCustomer = await response.json()
      setCustomers(customers.map((c) => (c.id === id ? updatedCustomer : c)))
      return updatedCustomer
    } catch (err: any) {
      console.error("Error toggling customer active status:", err)
      throw err
    }
  }

  const fetchCustomerAccountStatement = async (id: string): Promise<CustomerAccountStatement | null> => {
    if (!session?.access_token) return null

    try {
      const response = await fetch(`${API_ROOT}/customers/${id}/account-statement`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (err: any) {
      console.error("Error fetching customer account statement:", err)
      return null
    }
  }

  const fetchCustomerReceivables = async (id: string): Promise<CustomerReceivable[]> => {
    if (!session?.access_token) return []

    try {
      const response = await fetch(`${API_ROOT}/customers/${id}/receivables`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (err: any) {
      console.error("Error fetching customer receivables:", err)
      return []
    }
  }

  const createCustomerReceivable = async (
    customerId: string,
    data: CreateCustomerReceivableInput,
  ): Promise<CustomerReceivable | null> => {
    if (!session?.access_token) return null

    try {
      const response = await fetch(`${API_ROOT}/customers/${customerId}/receivables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        let errorData: any = {}
        try {
          errorData = JSON.parse(text || "{}")
        } catch {
          errorData = { message: text }
        }

        throw {
          message: errorData.message || text || `Error ${response.status}: ${response.statusText}`,
          status: response.status,
          errors: errorData.errors,
        }
      }

      return await response.json()
    } catch (err: any) {
      console.error("Error creating customer receivable:", err)
      throw err
    }
  }

  const registerCustomerReceivablePayment = async (
    customerId: string,
    receivableId: string,
    data: RegisterCustomerReceivablePaymentInput,
    invoiceFile?: File | null,
  ): Promise<CustomerReceivable | null> => {
    if (!session?.access_token) return null

    try {
      const body = new FormData()
      body.append("paymentDate", data.paymentDate)
      body.append("amount", String(Number(data.amount || 0)))
      body.append("reference", data.reference)
      if (data.notes) body.append("notes", data.notes)
      if (invoiceFile) body.append("invoiceFile", invoiceFile)

      const response = await fetch(`${API_ROOT}/customers/${customerId}/receivables/${receivableId}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        let errorData: any = {}
        try {
          errorData = JSON.parse(text || "{}")
        } catch {
          errorData = { message: text }
        }

        throw {
          message: errorData.message || text || `Error ${response.status}: ${response.statusText}`,
          status: response.status,
          errors: errorData.errors,
        }
      }

      return await response.json()
    } catch (err: any) {
      console.error("Error registering customer receivable payment:", err)
      throw err
    }
  }

  return {
    customers,
    isLoading,
    isError,
    error,
    fetchCustomers,
    searchCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    toggleCustomerActive,
    fetchCustomerAccountStatement,
    fetchCustomerReceivables,
    createCustomerReceivable,
    registerCustomerReceivablePayment,
  }
}
