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
    },
    shipments: {
      list: () => `${API_BASE_URL}/api/producers/shipments/all`,
      create: () => `${API_BASE_URL}/api/producers/shipments`,
      updateStatus: (id: string) => `${API_BASE_URL}/api/producers/shipments/${id}/status`,
    },
    accountStatement: (id: string) => `${API_BASE_URL}/api/producers/${id}/account-statement`,
    payments: {
      create: () => `${API_BASE_URL}/api/producers/payments`,
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
  get: (url: string) => ApiClient.get<any>(`${API_BASE_URL}${url}`),
  post: (url: string, data: any) => ApiClient.post<any>(`${API_BASE_URL}${url}`, data),
  patch: (url: string, data: any) => ApiClient.patch<any>(`${API_BASE_URL}${url}`, data),
  delete: (url: string) => ApiClient.delete<any>(`${API_BASE_URL}${url}`),
}
