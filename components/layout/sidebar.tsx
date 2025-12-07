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
  UserCog,
  Bell,
} from "lucide-react"
import { useAuth } from "@/lib/context/auth-context"
import { PermissionModule } from "@/lib/types/permissions"

interface NavigationItem {
  name: string
  href: string
  icon: any
  module?: PermissionModule
}

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Productos", href: "/products", icon: Package, module: "products" },
  { name: "Stock y Almacenes", href: "/inventory", icon: Warehouse, module: "inventory" },
  { name: "Productores", href: "/producers", icon: Sprout, module: "producers" },
  { name: "Proveedores", href: "/suppliers", icon: Users, module: "suppliers" },
  { name: "Órdenes de Compra", href: "/purchase-orders", icon: ShoppingCart, module: "purchaseOrders" },
  { name: "Reportes", href: "/reports", icon: BarChart3, module: "reports" },
  { name: "Notificaciones", href: "/notifications", icon: Bell },
  { name: "Importar/Exportar", href: "/import-export", icon: FileText },
  { name: "Usuarios", href: "/users", icon: UserCog, module: "users" },
  // { name: "Configuración", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, canRead } = useAuth()

  // Filtrar navegación según permisos
  const visibleNavigation = navigation.filter((item) => {
    // Si no tiene módulo definido, siempre es visible
    if (!item.module) return true
    // Si tiene módulo, verificar permiso de lectura
    return canRead(item.module)
  })

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
        {visibleNavigation.map((item) => {
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
            {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
