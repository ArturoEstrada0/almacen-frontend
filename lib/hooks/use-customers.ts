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

export type CreateCustomerInput = Omit<Customer, "id" | "createdAt" | "updatedAt" | "active"> & {
  active?: boolean
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
      const response = await fetch(`${API_ROOT}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
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
      const response = await fetch(`${API_ROOT}/customers/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
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
  }
}
