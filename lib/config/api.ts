// API Configuration for connecting to NestJS backend

let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_BASE_URL) {
  throw new Error(
    "Environment variable NEXT_PUBLIC_API_URL is not defined. Please set NEXT_PUBLIC_API_URL in your environment (e.g. .env.local) to the backend base URL. Example: http://localhost:3001/api"
  )
}

// No modificar el sufijo, el backend ya tiene el prefijo /api
API_BASE_URL = API_BASE_URL.replace(/\/+$/g, "")

export const API_ENDPOINTS = {
  // Products
  products: {
    list: () => `${API_BASE_URL}/api/products`,
    get: (id: string) => `${API_BASE_URL}/api/products/${id}`,
    create: () => `${API_BASE_URL}/api/products`,
    update: (id: string) => `${API_BASE_URL}/api/products/${id}`,
    delete: (id: string) => `${API_BASE_URL}/api/products/${id}`,
  },

  // Warehouses
  warehouses: {
    list: () => `${API_BASE_URL}/api/warehouses`,
    get: (id: string) => `${API_BASE_URL}/api/warehouses/${id}`,
    create: () => `${API_BASE_URL}/api/warehouses`,
    update: (id: string) => `${API_BASE_URL}/api/warehouses/${id}`,
    delete: (id: string) => `${API_BASE_URL}/api/warehouses/${id}`,
    locations: {
      list: () => `${API_BASE_URL}/api/warehouses/locations/all`,
      create: () => `${API_BASE_URL}/api/warehouses/locations`,
      delete: (id: string) => `${API_BASE_URL}/api/warehouses/locations/${id}`,
    },
  },

  // Inventory
  inventory: {
    list: (warehouseId?: string) => `${API_BASE_URL}/api/inventory${warehouseId ? `?warehouseId=${warehouseId}` : ""}`,
    byProduct: (productId: string) => `${API_BASE_URL}/api/inventory/product/${productId}`,
    movements: {
      list: (warehouseId?: string) =>
        `${API_BASE_URL}/api/inventory/movements${warehouseId ? `?warehouseId=${warehouseId}` : ""}`,
      get: (id: string) => `${API_BASE_URL}/api/inventory/movements/${id}`,
      create: () => `${API_BASE_URL}/api/inventory/movements`,
    },
  },

  // Suppliers
  suppliers: {
    list: () => `${API_BASE_URL}/api/suppliers`,
    get: (id: string) => `${API_BASE_URL}/api/suppliers/${id}`,
    create: () => `${API_BASE_URL}/api/suppliers`,
    update: (id: string) => `${API_BASE_URL}/api/suppliers/${id}`,
    delete: (id: string) => `${API_BASE_URL}/api/suppliers/${id}`,
  },

  // Purchase Orders
  purchaseOrders: {
    list: () => `${API_BASE_URL}/api/purchase-orders`,
    get: (id: string) => `${API_BASE_URL}/api/purchase-orders/${id}`,
    create: () => `${API_BASE_URL}/api/purchase-orders`,
    receive: (id: string, itemId: string) => `${API_BASE_URL}/api/purchase-orders/${id}/receive/${itemId}`,
    cancel: (id: string) => `${API_BASE_URL}/api/purchase-orders/${id}/cancel`,
    registerPayment: (id: string) => `${API_BASE_URL}/api/purchase-orders/${id}/payment`,
  },

  // Producers
  producers: {
    list: () => `${API_BASE_URL}/api/producers`,
    get: (id: string) => `${API_BASE_URL}/api/producers/${id}`,
    create: () => `${API_BASE_URL}/api/producers`,
    inputAssignments: {
      list: () => `${API_BASE_URL}/api/producers/input-assignments/all`,
      create: () => `${API_BASE_URL}/api/producers/input-assignments`,
    },
    fruitReceptions: {
      list: () => `${API_BASE_URL}/api/producers/fruit-receptions/all`,
      create: () => `${API_BASE_URL}/api/producers/fruit-receptions`,
      update: (id: string) => `${API_BASE_URL}/api/producers/fruit-receptions/${id}`,
      delete: (id: string) => `${API_BASE_URL}/api/producers/fruit-receptions/${id}`,
    },
    shipments: {
      list: () => `${API_BASE_URL}/api/producers/shipments/all`,
      create: () => `${API_BASE_URL}/api/producers/shipments`,
      update: (id: string) => `${API_BASE_URL}/api/producers/shipments/${id}`,
      updateStatus: (id: string) => `${API_BASE_URL}/api/producers/shipments/${id}/status`,
      delete: (id: string) => `${API_BASE_URL}/api/producers/shipments/${id}`,
    },
    accountStatement: (id: string) => `${API_BASE_URL}/api/producers/${id}/account-statement`,
    report: (id: string) => `${API_BASE_URL}/api/producers/${id}/report`,
    payments: {
      create: () => `${API_BASE_URL}/api/producers/payments`,
    },
    paymentReports: {
      list: () => `${API_BASE_URL}/api/producers/payment-reports/all`,
      get: (id: string) => `${API_BASE_URL}/api/producers/payment-reports/${id}`,
      create: () => `${API_BASE_URL}/api/producers/payment-reports`,
      update: (id: string) => `${API_BASE_URL}/api/producers/payment-reports/${id}`,
      updateStatus: (id: string) => `${API_BASE_URL}/api/producers/payment-reports/${id}/status`,
      delete: (id: string) => `${API_BASE_URL}/api/producers/payment-reports/${id}`,
    },
  },

  // Quotations
  quotations: {
    list: () => `${API_BASE_URL}/quotations`,
    get: (id: string) => `${API_BASE_URL}/quotations/${id}`,
    create: () => `${API_BASE_URL}/quotations`,
    markWinner: (id: string, supplierId: string) => `${API_BASE_URL}/quotations/${id}/winner/${supplierId}`,
  },

  // Users
  users: {
    list: () => `${API_BASE_URL}/api/users`,
    get: (id: string) => `${API_BASE_URL}/api/users/${id}`,
    create: () => `${API_BASE_URL}/api/users`,
    update: (id: string) => `${API_BASE_URL}/api/users/${id}`,
    delete: (id: string) => `${API_BASE_URL}/api/users/${id}`,
    toggleActive: (id: string) => `${API_BASE_URL}/api/users/${id}/toggle-active`,
    updatePassword: (id: string) => `${API_BASE_URL}/api/users/${id}/update-password`,
  },

  // Dashboard
  dashboard: {
    kpis: () => `${API_BASE_URL}/api/dashboard/kpis`,
    profitReport: () => `${API_BASE_URL}/api/dashboard/profit-report`,
  },
}

// API Client with error handling
export class ApiClient {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // Get the Supabase session token
    if (typeof window !== 'undefined') {
      try {
        const { supabase } = await import('@/lib/supabase/client')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      } catch (error) {
        console.error('Error getting auth token:', error)
      }
    }

    return headers
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // Try to parse JSON error body, otherwise read text
      let parsed: any = null
      try {
        parsed = await response.json()
      } catch (e) {
        try {
          parsed = await response.text()
        } catch (e2) {
          parsed = null
        }
      }

      const msg = parsed && typeof parsed === 'object' && parsed.message ? parsed.message : parsed || response.statusText
      
      // Si es un error 401, redirigir al login
      if (response.status === 401 && typeof window !== 'undefined') {
        console.error('Sesión expirada, redirigiendo al login...')
        window.location.href = '/auth/login'
      }
      
      throw new Error(`Request failed ${response.status} ${response.statusText} - ${msg} (url: ${response.url})`)
    }

    // Parse response body (could be empty)
    try {
      return await response.json()
    } catch (e) {
      // If there's no JSON body, return an empty value
      return undefined as unknown as T
    }
  }

  static async get<T>(url: string): Promise<T> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(url, {
      method: "GET",
      headers,
    })
    return this.handleResponse<T>(response)
  }

  static async post<T>(url: string, data: any): Promise<T> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    })
    return this.handleResponse<T>(response)
  }

  static async patch<T>(url: string, data: any): Promise<T> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    })
    return this.handleResponse<T>(response)
  }

  static async delete<T>(url: string): Promise<T> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(url, {
      method: "DELETE",
      headers,
    })
    return this.handleResponse<T>(response)
  }
}

export const api = {
  get: (url: string) => ApiClient.get<any>(`${API_BASE_URL}${url}`),
  post: (url: string, data: any) => ApiClient.post<any>(`${API_BASE_URL}${url}`, data),
  patch: (url: string, data: any) => ApiClient.patch<any>(`${API_BASE_URL}${url}`, data),
  delete: (url: string) => ApiClient.delete<any>(`${API_BASE_URL}${url}`),
}
