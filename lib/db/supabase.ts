import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// prepare exports as variables (will assign below depending on env)
let supabase: any
let handleSupabaseError: (error: any) => never

// If a real Supabase URL is provided, use the official client.
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)

  handleSupabaseError = function (error: any) {
    console.error("[Supabase Error]", error)
    throw new Error(error.message || "Database operation failed")
  }
} else {
  // Fallback: lightweight local shim that proxies basic operations to the local backend API
  // Useful for local development when you don't have a Supabase project configured.
  const backendUrl = process.env.NEXT_PUBLIC_LOCAL_BACKEND_URL || "http://localhost:3001"

  function buildQueryString(filters: any = {}) {
    const params = new URLSearchParams()
    for (const key of Object.keys(filters)) {
      const val = filters[key]
      if (Array.isArray(val)) params.append(key, val.join(","))
      else params.append(key, String(val))
    }
    const qs = params.toString()
    return qs ? `?${qs}` : ""
  }

  class LocalBuilder {
    table: string
    _filters: Array<{ type: string; field: string; value: any }>
    _order: { field: string; opts?: any } | null
    _selectCols: string | null
    _single: boolean

    constructor(table: string) {
      this.table = table
      this._filters = []
      this._order = null
      this._selectCols = null
      this._single = false
    }

    select(cols?: string) {
      this._selectCols = cols || null
      return this
    }

    eq(field: string, value: any) {
      this._filters.push({ type: "eq", field, value })
      return this
    }

    in(field: string, values: any[]) {
      this._filters.push({ type: "in", field, value: values })
      return this
    }

    order(field: string, opts?: any) {
      this._order = { field, opts }
      return this
    }

    raw(_val: string) {
      // noop placeholder for supabase.raw used in a few places
      return { toString: () => _val }
    }

    async _fetchAll() {
      const res = await fetch(`${backendUrl}/${this.table}`)
      if (!res.ok) {
        return { data: null, error: { message: `Request failed: ${res.status}` } }
      }

      let data = await res.json()

      // Apply simple filters locally
      for (const f of this._filters) {
        if (f.type === "eq") {
          data = data.filter((r: any) => {
            // support nested fields like producer.id? naive
            return r[f.field] === f.value || r[f.field] == String(f.value)
          })
        } else if (f.type === "in") {
          data = data.filter((r: any) => f.value.includes(r[f.field]))
        }
      }

      // Order
      if (this._order) {
        const fld = this._order.field
        data = data.sort((a: any, b: any) => (a[fld] > b[fld] ? 1 : a[fld] < b[fld] ? -1 : 0))
      }

      if (this._single) {
        return { data: data[0] ?? null, error: null }
      }

      return { data, error: null }
    }

    async single() {
      this._single = true
      const r = await this._fetchAll()
      return r
    }

    async then(resolve: any, reject: any) {
      // allow await on builder directly
      try {
        const r = await this._fetchAll()
        resolve(r)
      } catch (err) {
        reject(err)
      }
    }

    // Insert: POST to backend endpoint
    async insert(records: any[] | any) {
      const body = Array.isArray(records) ? (records.length === 1 ? records[0] : records) : records
      const res = await fetch(`${backendUrl}/${this.table}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text()
        return { data: null, error: { message: `Insert failed: ${res.status} ${text}` } }
      }

      const data = await res.json()
      return { data, error: null }
    }

    // Update: PATCH to resource(s). If an eq('id', id) exists we patch that resource path
    async update(payload: any) {
      const idFilter = this._filters.find((f) => f.type === "eq" && f.field === "id")
      if (idFilter) {
        const res = await fetch(`${backendUrl}/${this.table}/${idFilter.value}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const text = await res.text()
          return { data: null, error: { message: `Update failed: ${res.status} ${text}` } }
        }

        const data = await res.json()
        return { data, error: null }
      }

      // fallback: try bulk update endpoint
      const res = await fetch(`${backendUrl}/${this.table}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: this._filters, payload }),
      })

      if (!res.ok) {
        const text = await res.text()
        return { data: null, error: { message: `Update failed: ${res.status} ${text}` } }
      }

      const data = await res.json()
      return { data, error: null }
    }
  }

  const localSupabase = {
    from(table: string) {
      return new LocalBuilder(table) as any
    },
    raw(val: string) {
      return { toString: () => val }
    },
  }

  supabase = localSupabase

  handleSupabaseError = function (error: any) {
    console.error("[Local Supabase Error]", error)
    throw new Error(error?.message || "Database operation failed (local proxy)")
  }
}

export { supabase, handleSupabaseError }
