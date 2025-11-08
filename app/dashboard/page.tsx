"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useDashboardKPIs } from "@/lib/hooks/use-dashboard"
import { useMovements } from "@/lib/hooks/use-inventory"
import { useProducts } from "@/lib/hooks/use-products"
import { useLowStockProducts } from "@/lib/hooks/use-inventory"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { usePurchaseOrders } from "@/lib/hooks/use-purchase-orders"
import { useProducers } from "@/lib/hooks/use-producers"
import { useShipments } from "@/lib/hooks/use-producers"
import { formatCurrency, formatNumber } from "@/lib/utils/format"
import {
  Package,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  Activity,
  Users,
  Truck,
  DollarSign,
  Calendar,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const { kpis, isLoading: kpisLoading } = useDashboardKPIs()
  const { movements, isLoading: movementsLoading } = useMovements()
  const { products, isLoading: productsLoading, mutate: mutateProducts } = useProducts()
  const { lowStockProducts, isLoading: lowStockLoading } = useLowStockProducts()
  const { warehouses, isLoading: warehousesLoading } = useWarehouses()
  const { purchaseOrders, isLoading: ordersLoading } = usePurchaseOrders()
  const { producers, isLoading: producersLoading } = useProducers()
  const { shipments, isLoading: shipmentsLoading } = useShipments()

  // Sumar productos activos desde la API
  const activeProductsCount = products?.filter((p) => p.isActive).length ?? 0;

  // KPIs
  const recentMovements = movements?.slice(0, 5) || []
  const lowStockItems = lowStockProducts || []

  // Calcular valor total de inventario sumando el valor de cada producto en stock
  const totalInventoryValue = (() => {
    if (!products || !products.length || !warehouses) return 0;
    // Obtener todos los stocks
    let stockList = [];
    try {
      // Si hay mockStock disponible, úsalo
      // @ts-ignore
      stockList = require("@/lib/mock-data").mockStock || [];
    } catch {
      stockList = [];
    }
    if (!stockList.length) return 0;
    return stockList.reduce((sum: number, stock: any) => {
      const product = products.find((p) => p.id === stock.productId);
      if (!product) return sum;
      return sum + (stock.availableQuantity || 0) * (product.costPrice || 0);
    }, 0);
  })();

  // Purchase Orders KPIs
  const pendingOrders = purchaseOrders?.filter((o) => o.status === "pendiente" || o.status === "parcial") || [];
  const payableOrders = purchaseOrders?.filter((o) => o.paymentStatus !== "pagado") || [];
  const totalPayable = payableOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const overduePayments = payableOrders.filter((o) => o.dueDate && new Date() > new Date(o.dueDate));

  // Producers KPIs
  const activeProducers = producers?.filter((p) => p.isActive) || [];
  const producersWithDebt = producers?.filter((p) => p.accountBalance < 0) || [];
  const producersWithCredit = producers?.filter((p) => p.accountBalance > 0) || [];
  const totalProducerDebt = producersWithDebt.reduce((sum, p) => sum + Math.abs(p.accountBalance || 0), 0);
  const totalProducerCredit = producersWithCredit.reduce((sum, p) => sum + (p.accountBalance || 0), 0);

  // Shipments KPIs
  const activeShipments = shipments?.filter((s) => s.status === "embarcada" || s.status === "en-transito") || [];
  const pendingShipments = shipments?.filter((s) => s.status === "recibida" && !s.salePrice) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Vista general del sistema de almacén</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/inventory">Ver Inventario</Link>
          </Button>
          <Button asChild>
            <Link href="/purchase-orders/new">Nueva Orden</Link>
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Activos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProductsCount}</div>
            <p className="text-xs text-muted-foreground">Productos activos en inventario</p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{typeof kpis?.lowStockProducts === "number" ? kpis.lowStockProducts : 0}</div>
            <p className="text-xs text-muted-foreground">Productos bajo mínimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{pendingOrders.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">En proceso de recepción</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuentas por Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(totalPayable)}</div>
            <p className="text-xs text-muted-foreground">
              {overduePayments.length > 0 ? `${overduePayments.length} vencidas` : "Sin vencidas"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Cards - Producers & Shipments */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productores Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducers.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">{producersWithDebt.length ?? 0} con saldo en contra</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Pagar a Productores</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(totalProducerCredit)}</div>
            <p className="text-xs text-muted-foreground">{producersWithCredit.length ?? 0} productores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embarques Activos</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{activeShipments.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">En tránsito o embarcadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pendingShipments.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">Recibidas sin precio</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Principales</CardTitle>
            <CardDescription>Mayor valor en inventario</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(kpis?.topProducts?.length ? kpis.topProducts : []).map((item: any, index: number) => (
                <div key={item.product.id} className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(item.quantity)} unidades • {item.product.type}
                    </p>
                  </div>
                  <div className="text-sm font-medium">{formatCurrency(item.value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stock by Warehouse */}
        <Card>
          <CardHeader>
            <CardTitle>Inventario por Almacén</CardTitle>
            <CardDescription>Distribución de valor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(kpis?.stockByWarehouse?.length ? kpis.stockByWarehouse : []).map((item: any) => (
                <div key={item.warehouse.id} className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{item.warehouse.name}</p>
                    <p className="text-xs text-muted-foreground">{item.productCount} productos</p>
                  </div>
                  <div className="text-sm font-medium">{formatCurrency(item.totalValue)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Movements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Movimientos Recientes</CardTitle>
                <CardDescription>Últimas transacciones</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/inventory?tab=movements">Ver todos</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(recentMovements.length ? recentMovements : []).map((movement) => {
                const product = products.find((p) => p.id === movement.productId)
                const warehouse = warehouses.find((w) => w.id === movement.warehouseId)
                return (
                  <div key={movement.id} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {movement.type === "entrada" && <TrendingUp className="h-5 w-5 text-green-500" />}
                      {movement.type === "salida" && <TrendingDown className="h-5 w-5 text-red-500" />}
                      {movement.type === "ajuste" && <Activity className="h-5 w-5 text-orange-500" />}
                      {movement.type === "traspaso" && <Activity className="h-5 w-5 text-blue-500" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{product?.name ?? "Sin producto"}</p>
                      <p className="text-xs text-muted-foreground">
                        {warehouse?.name ?? "Sin almacén"} • {movement.createdAt ? new Date(movement.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <Badge
                      variant={
                        movement.type === "entrada"
                          ? "default"
                          : movement.type === "salida"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {movement.type}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Alertas de Stock Bajo</CardTitle>
                <CardDescription>Productos que requieren reabastecimiento</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/purchase-orders?tab=new">Crear Orden</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay productos que requieran reabastecimiento</p>
            ) : (
              <div className="space-y-4">
                {lowStockItems
                  .filter((stock) => {
                    const product = products.find((p) => p.id === stock.productId)
                    return product && stock.availableQuantity < (product.minStock ?? 0)
                  })
                  .map((stock) => {
                    const product = products.find((p) => p.id === stock.productId)
                    const warehouse = warehouses.find((w) => w.id === stock.warehouseId)
                    if (!product) return null
                    return (
                      <div key={stock.id} className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {warehouse?.name ?? "Sin almacén"} • Stock: {stock.availableQuantity ?? 0} / Mínimo: {product.minStock ?? 0}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/purchase-orders?tab=new&productId=${product.id}`}>Ordenar</Link>
                        </Button>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
