// Prefer an explicit local backend override, otherwise use the main API URL.
const API_URL = process.env.NEXT_PUBLIC_LOCAL_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  throw new Error(
    "Environment variable NEXT_PUBLIC_LOCAL_BACKEND_URL or NEXT_PUBLIC_API_URL must be defined. Set one of them in your environment (e.g. .env.local)."
  )
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
  const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Request failed ${res.status}: ${text}`)
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
