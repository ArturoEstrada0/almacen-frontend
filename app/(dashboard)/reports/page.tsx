"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils/format"
import { Download, TrendingUp, DollarSign, AlertTriangle, BarChart3, TrendingDown, Package } from "lucide-react"
import { motion } from "framer-motion"
import { useProfitReport } from "@/lib/hooks/use-dashboard"
import { useProducts } from "@/lib/hooks/use-products"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { useInventoryByWarehouse } from "@/lib/hooks/use-inventory"
import { useMovements } from "@/lib/hooks/use-inventory"
import { useLowStockProducts } from "@/lib/hooks/use-inventory"

export default function ReportsPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all")
  const { profitReport, isLoading: isProfitLoading } = useProfitReport()
  const { products, isLoading: isLoadingProducts } = useProducts()
  const { warehouses, isLoading: isLoadingWarehouses } = useWarehouses()
  const { inventory: allInventory, isLoading: isLoadingInventory } = useInventoryByWarehouse(null)
  const { movements, isLoading: isLoadingMovements } = useMovements({})
  const { lowStockProducts, isLoading: isLoadingLowStock } = useLowStockProducts()

  // Calculate stock valuation from real data
  const stockValuation = (allInventory || []).map((stock) => {
    const product = products.find((p) => p.id === stock.productId)
    const warehouse = warehouses.find((w) => w.id === stock.warehouseId)
    return {
      ...stock,
      product,
      warehouse,
      value: (stock.currentStock || 0) * (product?.costPrice || 0),
    }
  }).filter((item) => selectedWarehouse === "all" || item.warehouseId === selectedWarehouse)

  const totalValue = stockValuation.reduce((sum, item) => sum + item.value, 0)
  const totalProducts = products.length
  const totalMovements = movements?.length || 0

  // ABC Analysis from real data
  const abcAnalysis = products
    .map((product) => {
      const productInventory = allInventory.filter((s) => s.productId === product.id)
      const totalQty = productInventory.reduce((sum, s) => sum + (s.currentStock || 0), 0)
      const value = totalQty * product.costPrice
      const productMovements = movements?.filter((m) => 
        m.items?.some((item: any) => item.productId === product.id)
      ) || []
      
      return {
        product,
        totalQty,
        value,
        movementCount: productMovements.length,
      }
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)

  const totalABCValue = abcAnalysis.reduce((sum, item) => sum + item.value, 0)
  let cumulativeValue = 0
  const abcWithClass = abcAnalysis.map((item) => {
    cumulativeValue += item.value
    const percentage = totalABCValue > 0 ? (cumulativeValue / totalABCValue) * 100 : 0
    let classification = "C"
    if (percentage <= 80) classification = "A"
    else if (percentage <= 95) classification = "B"
    return { ...item, classification, percentage }
  })

  const reports = [
    {
      id: "stock-valuation",
      title: "Valorización de Inventario",
      description: "Valor total del inventario por almacén y categoría",
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      id: "movements-report",
      title: "Reporte de Movimientos",
      description: "Historial detallado de entradas, salidas y ajustes",
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      id: "low-stock",
      title: "Productos con Stock Bajo",
      description: "Productos que requieren reabastecimiento urgente",
      icon: AlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      id: "abc-analysis",
      title: "Análisis ABC",
      description: "Clasificación de productos por valor y rotación",
      icon: BarChart3,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ]

  const handleExport = (reportType: string) => {
    console.log("[v0] Exporting report:", reportType)
    // In a real app, this would generate and download an Excel file
    alert(`Exportando reporte: ${reportType}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes y Análisis</h1>
        <p className="text-muted-foreground">Genera reportes detallados y análisis de tu inventario</p>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
          <TabsTrigger value="profit">Utilidades</TabsTrigger>
          <TabsTrigger value="valuation">Valorización</TabsTrigger>
          <TabsTrigger value="low-stock">Stock Bajo</TabsTrigger>
          <TabsTrigger value="abc">Análisis ABC</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {reports.map((report, index) => {
              const Icon = report.icon
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedReport(report.id)}
                  >
                    <CardHeader>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${report.bgColor} mb-4`}>
                        <Icon className={`h-6 w-6 ${report.color}`} />
                      </div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" onClick={() => handleExport(report.id)}>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumen General</CardTitle>
              <CardDescription>Métricas clave del inventario</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProducts || isLoadingInventory || isLoadingMovements || isLoadingLowStock ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Cargando métricas...</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Productos</p>
                    <p className="text-2xl font-bold">{totalProducts}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Stock Bajo</p>
                    <p className="text-2xl font-bold text-orange-500">{lowStockProducts.length}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Movimientos Totales</p>
                    <p className="text-2xl font-bold">{totalMovements}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit" className="space-y-4">
          {isProfitLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Cargando reporte de utilidades...</p>
              </CardContent>
            </Card>
          ) : profitReport ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(profitReport.summary?.totalRevenue || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      De ventas confirmadas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Costos Totales</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(profitReport.summary?.totalCosts || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Compras e insumos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Utilidad Bruta</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${(profitReport.summary?.grossProfit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(profitReport.summary?.grossProfit || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ingresos - Costos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Margen de Utilidad</CardTitle>
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${(profitReport.summary?.profitMargin || 0) >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                      {(profitReport.summary?.profitMargin || 0).toFixed(2)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Porcentaje de ganancia
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Métricas por Caja</CardTitle>
                    <CardDescription>Costo y utilidad promedio</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Costo por Caja</span>
                      <span className="font-bold">{formatCurrency(profitReport.summary?.costPerBox || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Utilidad por Caja</span>
                      <span className={`font-bold ${(profitReport.summary?.profitPerBox || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(profitReport.summary?.profitPerBox || 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resumen de Operaciones</CardTitle>
                    <CardDescription>Totales de compras y ventas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Compras</span>
                      <span className="font-bold">{formatCurrency(profitReport.costs?.totalPurchaseCosts || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Insumos Asignados</span>
                      <span className="font-bold">{formatCurrency(profitReport.costs?.totalInputAssignmentCosts || 0)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Costos por Producto</CardTitle>
                  <CardDescription>Desglose de insumos asignados a productores</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Costo Total</TableHead>
                        <TableHead className="text-right">Costo Promedio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitReport.costs?.inputAssignmentsByProduct?.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-right">{item.totalQuantity.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.totalCost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.avgCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Embarques Vendidos</CardTitle>
                  <CardDescription>Detalle de ingresos por embarques confirmados</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Folio</TableHead>
                        <TableHead>Productor</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Cajas</TableHead>
                        <TableHead className="text-right">Precio Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitReport.revenue?.shipments?.map((shipment: any) => (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-medium">{shipment.trackingFolio || `#${shipment.id}`}</TableCell>
                          <TableCell>{shipment.producerName}</TableCell>
                          <TableCell>{new Date(shipment.shipmentDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">{shipment.totalBoxes}</TableCell>
                          <TableCell className="text-right">{formatCurrency(shipment.totalPrice)}</TableCell>
                        </TableRow>
                      ))}
                      {(!profitReport.revenue?.shipments || profitReport.revenue.shipments.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No hay embarques vendidos registrados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">No se pudo cargar el reporte de utilidades</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="valuation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Valorización de Inventario</CardTitle>
                  <CardDescription>Valor total del inventario por producto y almacén</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Todos los almacenes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los almacenes</SelectItem>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => handleExport("valuation")}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingInventory || isLoadingProducts || isLoadingWarehouses ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando valorización...</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Valor Total del Inventario</p>
                    <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Almacén</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Costo Unit.</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockValuation.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              No hay datos de inventario disponibles
                            </TableCell>
                          </TableRow>
                        ) : (
                          stockValuation.map((item, index) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.product?.name || 'N/A'}</TableCell>
                              <TableCell className="text-muted-foreground">{item.product?.sku || 'N/A'}</TableCell>
                              <TableCell>{item.warehouse?.name || 'N/A'}</TableCell>
                              <TableCell className="text-right">{item.currentStock || 0}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.product?.costPrice || 0)}</TableCell>
                              <TableCell className="text-right font-bold">{formatCurrency(item.value)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Productos con Stock Bajo</CardTitle>
                  <CardDescription>Productos que requieren reabastecimiento urgente</CardDescription>
                </div>
                <Button onClick={() => handleExport("low-stock")}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLowStock || isLoadingProducts || isLoadingWarehouses ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando productos con stock bajo...</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Almacén</TableHead>
                        <TableHead className="text-right">Stock Actual</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No hay productos con stock bajo
                          </TableCell>
                        </TableRow>
                      ) : (
                        lowStockProducts.map((stock: any) => {
                          const product = products.find((p) => p.id === stock.productId)
                          const warehouse = warehouses.find((w) => w.id === stock.warehouseId)
                          const currentStock = stock.currentStock || stock.quantity || 0
                          const isCritical = currentStock === 0

                          return (
                            <TableRow key={stock.id}>
                              <TableCell className="font-medium">{product?.name || 'N/A'}</TableCell>
                              <TableCell className="text-muted-foreground">{product?.sku || 'N/A'}</TableCell>
                              <TableCell>{warehouse?.name || 'N/A'}</TableCell>
                              <TableCell className="text-right font-bold">{currentStock}</TableCell>
                              <TableCell>
                                <Badge variant={isCritical ? "destructive" : "secondary"}>
                                  {isCritical ? "Sin Stock" : "Stock Bajo"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abc" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Análisis ABC</CardTitle>
                  <CardDescription>Clasificación de productos por valor e importancia</CardDescription>
                </div>
                <Button onClick={() => handleExport("abc-analysis")}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingProducts || isLoadingInventory ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando análisis ABC...</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <p className="text-sm text-muted-foreground">Clase A (80% valor)</p>
                      <p className="text-2xl font-bold text-green-600">
                        {abcWithClass.filter((i) => i.classification === "A").length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Alta prioridad</p>
                    </div>
                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <p className="text-sm text-muted-foreground">Clase B (15% valor)</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {abcWithClass.filter((i) => i.classification === "B").length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Media prioridad</p>
                    </div>
                    <div className="p-4 bg-gray-500/10 rounded-lg border border-gray-500/20">
                      <p className="text-sm text-muted-foreground">Clase C (5% valor)</p>
                      <p className="text-2xl font-bold text-gray-600">
                        {abcWithClass.filter((i) => i.classification === "C").length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Baja prioridad</p>
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Cantidad Total</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">% Acumulado</TableHead>
                          <TableHead>Clasificación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {abcWithClass.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              No hay datos suficientes para análisis ABC
                            </TableCell>
                          </TableRow>
                        ) : (
                          abcWithClass.map((item) => (
                            <TableRow key={item.product.id}>
                              <TableCell className="font-medium">{item.product.name}</TableCell>
                              <TableCell className="text-muted-foreground">{item.product.sku}</TableCell>
                              <TableCell className="text-right">{item.totalQty.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                              <TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    item.classification === "A"
                                      ? "default"
                                      : item.classification === "B"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className={
                                    item.classification === "A"
                                      ? "bg-green-500"
                                      : item.classification === "B"
                                      ? "bg-blue-500"
                                      : "bg-gray-500"
                                  }
                                >
                                  {item.classification}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
