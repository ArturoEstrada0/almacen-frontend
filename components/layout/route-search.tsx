"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface RouteItem {
  id: string
  label: string
  description?: string
  href: string
}

export default function RouteSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter()
  const pathname = usePathname() || "/"
  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery("")
      setHighlight(0)
    }
  }, [open])

  const routes: RouteItem[] = useMemo(() => {
    // Lista de rutas para búsqueda rápida
    return [
      { id: "dashboard", label: "Dashboard", description: "Vista general", href: "/" },
      { id: "products", label: "Productos", description: "Gestión de productos", href: "/products" },
      { id: "inventory", label: "Stock y Almacenes", description: "Ver almacenes", href: "/inventory" },
      { id: "producers", label: "Productores", description: "Gestión de productores", href: "/producers" },
      { id: "suppliers", label: "Proveedores", description: "Gestión de proveedores", href: "/suppliers" },
      { id: "purchase-orders", label: "Órdenes de Compra", description: "Listado de órdenes", href: "/purchase-orders?tab=list" },
      /*{ id: "purchase-orders-new", label: "Nueva Orden", description: "Crear nueva orden", href: "/purchase-orders?tab=new" },
      { id: "purchase-orders-payables", label: "Cuentas por Pagar", description: "Órdenes con pagos pendientes", href: "/purchase-orders?tab=payables" },*/
      { id: "reports", label: "Reportes", description: "Informes y reportes", href: "/reports" },
      { id: "notifications", label: "Notificaciones", description: "Gestión de notificaciones", href: "/notifications" },
      { id: "import/export", label: "Importar/Exportar", description: "Herramientas de importación y exportación", href: "/import-export" },
      { id: "users", label: "Usuarios", description: "Gestión de usuarios", href: "/users" },
    ]
  }, [])

  const filtered = routes.filter((r) => {
    if (!query) return true
    const q = query.toLowerCase()
    return r.label.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q) || r.href.toLowerCase().includes(q)
  })

  useEffect(() => setHighlight(0), [query])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlight((h) => Math.min(filtered.length - 1, h + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => Math.max(0, h - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filtered[highlight]) {
        router.push(filtered[highlight].href)
        onOpenChange(false)
      }
    } else if (e.key === "Escape") {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[680px] p-0">
        <DialogHeader>
          <DialogTitle className="p-4">Navegar — Buscar rutas</DialogTitle>
        </DialogHeader>

        <div className="p-4">
          <Input
            ref={inputRef}
            placeholder="Buscar rutas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />

          <div className="mt-3 max-h-60 overflow-auto rounded-md border">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No hay resultados</div>
            ) : (
              filtered.map((r, i) => (
                <button
                  key={r.id}
                  className={`w-full text-left p-3 hover:bg-muted ${i === highlight ? "bg-muted" : ""}`}
                  onClick={() => {
                    router.push(r.href)
                    onOpenChange(false)
                  }}
                  onMouseEnter={() => setHighlight(i)}
                >
                  <div className="font-medium">{r.label}</div>
                  {r.description && <div className="text-sm text-muted-foreground">{r.description}</div>}
                </button>
              ))
            )}
          </div>

          <div className="mt-3 flex justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
