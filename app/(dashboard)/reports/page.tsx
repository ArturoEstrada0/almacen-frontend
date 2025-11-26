"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { mockProducts, mockStock, mockWarehouses, mockMovements } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils/format"
import { Download, TrendingUp, DollarSign, AlertTriangle, BarChart3, FileSpreadsheet } from "lucide-react"
import { motion } from "framer-motion"

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all")

  // Calculate stock valuation
  const stockValuation = mockStock.map((stock) => {
    const product = mockProducts.find((p) => p.id === stock.productId)
    const warehouse = mockWarehouses.find((w) => w.id === stock.warehouseId)
    return {
      ...stock,
      product,
      warehouse,
      value: stock.quantity * (product?.costPrice || 0),
    }
  })

  const totalValue = stockValuation.reduce((sum, item) => sum + item.value, 0)

  // Low stock products
  const lowStockProducts = mockStock.filter((stock) => {
    const product = mockProducts.find((p) => p.id === stock.productId)
    return product && stock.quantity <= product.minStock
  })

  // ABC Analysis
  const abcAnalysis = mockProducts
    .map((product) => {
      const stock = mockStock.filter((s) => s.productId === product.id)
      const totalQty = stock.reduce((sum, s) => sum + s.quantity, 0)
      const value = totalQty * product.costPrice
      const movements = mockMovements.filter((m) => m.productId === product.id)
      return {
        product,
        totalQty,
        value,
        movementCount: movements.length,
      }
    })
    .sort((a, b) => b.value - a.value)

  const totalABCValue = abcAnalysis.reduce((sum, item) => sum + item.value, 0)
  let cumulativeValue = 0
  const abcWithClass = abcAnalysis.map((item) => {
    cumulativeValue += item.value
    const percentage = (cumulativeValue / totalABCValue) * 100
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
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Productos</p>
                  <p className="text-2xl font-bold">{mockProducts.length}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Stock Bajo</p>
                  <p className="text-2xl font-bold text-orange-500">{lowStockProducts.length}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Movimientos (Mes)</p>
                  <p className="text-2xl font-bold">{mockMovements.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                      {mockWarehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => handleExport("valuation")}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                    {stockValuation
                      .filter((item) => selectedWarehouse === "all" || item.warehouseId === selectedWarehouse)
                      .map((item, index) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <TableCell className="font-medium">{item.product?.name}</TableCell>
                          <TableCell className="text-muted-foreground">{item.product?.sku}</TableCell>
                          <TableCell>{item.warehouse?.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.product?.costPrice || 0)}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(item.value)}</TableCell>
                        </motion.tr>
                      ))}
                  </TableBody>
                </Table>
              </div>
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
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Almacén</TableHead>
                      <TableHead className="text-right">Stock Actual</TableHead>
                      <TableHead className="text-right">Stock Mínimo</TableHead>
                      <TableHead className="text-right">Requerido</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockProducts.map((stock, index) => {
                      const product = mockProducts.find((p) => p.id === stock.productId)
                      const warehouse = mockWarehouses.find((w) => w.id === stock.warehouseId)
                      const required = (product?.maxStock || 0) - stock.quantity
                      const isCritical = stock.quantity < (product?.minStock || 0) * 0.5

                      return (
                        <motion.tr
                          key={stock.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <TableCell className="font-medium">{product?.name}</TableCell>
                          <TableCell className="text-muted-foreground">{product?.sku}</TableCell>
                          <TableCell>{warehouse?.name}</TableCell>
                          <TableCell className="text-right font-bold">{stock.quantity}</TableCell>
                          <TableCell className="text-right">{product?.minStock}</TableCell>
                          <TableCell className="text-right text-blue-600">{required}</TableCell>
                          <TableCell>
                            <Badge variant={isCritical ? "destructive" : "secondary"}>
                              {isCritical ? "Crítico" : "Bajo"}
                            </Badge>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
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
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    {abcWithClass.map((item, index) => (
                      <motion.tr
                        key={item.product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <TableCell className="font-medium">{item.product.name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.product.sku}</TableCell>
                        <TableCell className="text-right">{item.totalQty}</TableCell>
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
                                  : ""
                            }
                          >
                            Clase {item.classification}
                          </Badge>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
