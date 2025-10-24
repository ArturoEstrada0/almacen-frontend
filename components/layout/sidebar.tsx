"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Users,
  ShoppingCart,
  BarChart3,
  FileText,
  Settings,
  Sprout,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Productos", href: "/products", icon: Package },
  { name: "Stock y Almacenes", href: "/inventory", icon: Warehouse },
  { name: "Productores", href: "/producers", icon: Sprout },
  { name: "Proveedores", href: "/suppliers", icon: Users },
  { name: "Órdenes de Compra", href: "/purchase-orders", icon: ShoppingCart },
  { name: "Reportes", href: "/reports", icon: BarChart3 },
  { name: "Importar/Exportar", href: "/import-export", icon: FileText },
  { name: "Configuración", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-balance">Sistema de Almacén</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            AU
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Admin Usuario</p>
            <p className="text-xs text-muted-foreground truncate">admin@almacen.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}
