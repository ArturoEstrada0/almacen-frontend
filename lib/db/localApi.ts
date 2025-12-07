// Prefer an explicit local backend override, otherwise use the main API URL.
const API_URL = process.env.NEXT_PUBLIC_LOCAL_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  throw new Error(
    "Environment variable NEXT_PUBLIC_LOCAL_BACKEND_URL or NEXT_PUBLIC_API_URL must be defined. Set one of them in your environment (e.g. .env.local)."
  )
}

async function getAuthHeaders(): Promise<Record<string, string>> {
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

async function request(path: string, opts: RequestInit = {}) {
  // Ensure API routes include the `/api` prefix used by the backend
  let normalized = path
  if (path.startsWith("/")) {
    normalized = path.startsWith("/api") ? path : `/api${path}`
  } else {
    normalized = path.startsWith("api") ? `/${path}` : `/api/${path}`
  }
  const url = `${API_URL}${normalized}`
  
  // Get auth headers
  const authHeaders = await getAuthHeaders()
  const headers = { ...authHeaders, ...(opts.headers || {}) }
  
  let res: Response
  try {
    res = await fetch(url, { ...opts, headers })
  } catch (err: any) {
    // Network-level errors (e.g. ECONNREFUSED, DNS issues) end up here
    const error: any = new Error(`No se pudo conectar con el servidor. Verifique su conexión a internet.`)
    error.statusCode = 0
    error.originalError = err?.message || String(err)
    throw error
  }

  if (!res.ok) {
    let errorData: any = null
    try {
      const text = await res.text()
      errorData = JSON.parse(text)
    } catch (e) {
      errorData = null
    }
    
    // Si es un error 401, redirigir al login
    if (res.status === 401 && typeof window !== 'undefined') {
      console.error('Sesión expirada, redirigiendo al login...')
      window.location.href = '/auth/login'
    }
    
    // Crear un objeto de error estructurado
    const error: any = new Error(errorData?.message || `Error ${res.status}`)
    error.statusCode = res.status
    error.status = res.status
    error.errors = errorData?.errors
    error.timestamp = errorData?.timestamp
    error.path = errorData?.path
    error.technicalDetails = errorData?.technicalDetails
    
    throw error
  }
  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("application/json")) return await res.json()
  return await res.text()
}

export async function apiGet(path: string, params?: Record<string, any>) {
  let p = path
  if (params) {
    const qs = new URLSearchParams()
    for (const k of Object.keys(params)) qs.append(k, String(params[k]))
    p = `${path}${p.includes("?") ? "&" : "?"}${qs.toString()}`
  }
  // Para obtener el inventario de un almacén, usa la ruta correcta con el prefijo /api
  // Ejemplo: apiGet('/inventory/warehouse/ID')
  // Esto se convertirá en /api/inventory/warehouse/ID automáticamente
  return await request(p, { method: "GET" })
}

export async function apiPost(path: string, body?: any) {
  return await request(path, { method: "POST", body: JSON.stringify(body) })
}

export async function apiPatch(path: string, body?: any) {
  return await request(path, { method: "PATCH", body: JSON.stringify(body) })
}

export async function apiDelete(path: string) {
  return await request(path, { method: "DELETE" })
}

export default { apiGet, apiPost, apiPatch, apiDelete }
