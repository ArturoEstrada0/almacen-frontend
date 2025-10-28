// API Configuration for connecting to NestJS backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_BASE_URL) {
  throw new Error(
    "Environment variable NEXT_PUBLIC_API_URL is not defined. Please set NEXT_PUBLIC_API_URL in your environment (e.g. .env.local) to the backend base URL."
  )
}

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
  },

  // Producers
  producers: {
    list: () => `${API_BASE_URL}/producers`,
    get: (id: string) => `${API_BASE_URL}/producers/${id}`,
    create: () => `${API_BASE_URL}/producers`,
    inputAssignments: {
      list: () => `${API_BASE_URL}/producers/input-assignments/all`,
      create: () => `${API_BASE_URL}/producers/input-assignments`,
    },
    fruitReceptions: {
      list: () => `${API_BASE_URL}/producers/fruit-receptions/all`,
      create: () => `${API_BASE_URL}/producers/fruit-receptions`,
    },
    shipments: {
      list: () => `${API_BASE_URL}/producers/shipments/all`,
      create: () => `${API_BASE_URL}/producers/shipments`,
      updateStatus: (id: string) => `${API_BASE_URL}/producers/shipments/${id}/status`,
    },
    accountStatement: (id: string) => `${API_BASE_URL}/producers/${id}/account-statement`,
    payments: {
      create: () => `${API_BASE_URL}/producers/payments`,
    },
  },

  // Quotations
  quotations: {
    list: () => `${API_BASE_URL}/quotations`,
    get: (id: string) => `${API_BASE_URL}/quotations/${id}`,
    create: () => `${API_BASE_URL}/quotations`,
    markWinner: (id: string, supplierId: string) => `${API_BASE_URL}/quotations/${id}/winner/${supplierId}`,
  },
}

// API Client with error handling
export class ApiClient {
  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "An error occurred" }))
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`)
    }
    return response.json()
  }

  static async get<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    return this.handleResponse<T>(response)
  }

  static async post<T>(url: string, data: any): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    return this.handleResponse<T>(response)
  }

  static async patch<T>(url: string, data: any): Promise<T> {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    return this.handleResponse<T>(response)
  }

  static async delete<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })
    return this.handleResponse<T>(response)
  }
}

export const api = {
  get: (url: string) => ApiClient.get<any>(`${API_BASE_URL}/api${url}`),
  post: (url: string, data: any) => ApiClient.post<any>(`${API_BASE_URL}/api${url}`, data),
  patch: (url: string, data: any) => ApiClient.patch<any>(`${API_BASE_URL}/api${url}`, data),
  delete: (url: string) => ApiClient.delete<any>(`${API_BASE_URL}/api${url}`),
}
