"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockProducts } from "@/lib/mock-data"
import { useInventoryByWarehouse, useMovements, updateInventoryStock } from "@/lib/hooks/use-inventory"
import { useMemo } from "react"
import { useProducts } from "@/lib/hooks/use-products"
import { formatNumber } from "@/lib/utils/format"
import { Search, AlertTriangle, Download, Upload, ArrowLeftRight } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface StockTabProps {
  warehouseId?: string
}

export function StockTab({ warehouseId }: StockTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const { inventory } = useInventoryByWarehouse(warehouseId || null)
  const { products } = useProducts()
  const { movements } = useMovements({ warehouseId })

  // Build a map of latest lot numbers by product from recent movements
  const latestLotByProduct = useMemo(() => {
    const map: Record<string, string | undefined> = {}
    ;(movements || []).forEach((m: any) => {
      const createdAt = new Date(m.createdAt || m.created_at || Date.now())
      ;(m.items || []).forEach((it: any) => {
        if (!map[it.productId]) {
          // prefer movement.lotNumber normalized earlier
          map[it.productId] = m.lotNumber || it.lotNumber || (it.notes && String(it.notes).match(/Lote:\s*(.+)/i)?.[1])
        }
      })
    })
    return map
  }, [movements])

  const filteredStock = inventory.filter((stock) => {
    const product = products.find((p) => p.id === stock.productId)
    const matchesSearch =
      (product?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product?.sku || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesWarehouse = !warehouseId || stock.warehouseId === warehouseId

    let matchesStatus = true
    const min = product ? product.minStock || stock.minStock || 0 : stock.minStock || 0
    const max = product ? product.maxStock || stock.maxStock || 0 : stock.maxStock || 0
    if (filterStatus === "low" && product) {
      matchesStatus = stock.currentStock < min
    } else if (filterStatus === "normal" && product) {
      matchesStatus = stock.currentStock >= min && stock.currentStock <= max
    } else if (filterStatus === "high" && product) {
      matchesStatus = stock.currentStock > max
    }

    return matchesSearch && matchesWarehouse && matchesStatus
  })

  const getStockStatus = (stock: any) => {
    const product = products.find((p) => p.id === stock.productId)
    if (!product) return "normal"
    const min = product.minStock || stock.minStock || 0
    const max = product.maxStock || stock.maxStock || 0
    if (stock.currentStock < min) return "low"
    if (stock.currentStock > max) return "high"
    return "normal"
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Nuevo Movimiento
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por producto o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="low">Stock Bajo</SelectItem>
                <SelectItem value="normal">Stock Normal</SelectItem>
                <SelectItem value="high">Stock Alto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock Actual por Ubicación</CardTitle>
          <CardDescription>
            {filteredStock.length} registro{filteredStock.length !== 1 ? "s" : ""} encontrado
            {filteredStock.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead>Reservado</TableHead>
                <TableHead>Stock Min/Max</TableHead>
                <TableHead>Punto Reorden</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStock.map((stock) => {
                const product = products.find((p) => p.id === stock.productId)
                const status = getStockStatus(stock)

                return (
                  <TableRow key={stock.id}>
                    <TableCell className="font-mono text-sm">{product?.sku}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product?.name}</p>
                        <p className="text-xs text-muted-foreground">{product?.unitOfMeasure || stock.unitOfMeasure || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{stock.location || "Sin asignar"}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{stock.lotNumber || latestLotByProduct[stock.productId] || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {stock.expirationDate ? stock.expirationDate.toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="font-medium">{formatNumber(stock.currentStock)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatNumber(stock.reservedQuantity || 0)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground">{formatNumber(product?.minStock || stock.minStock || 0)}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{formatNumber(product?.maxStock || stock.maxStock || 0)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatNumber(product?.reorderPoint || stock.reorderPoint || 0)}</Badge>
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <div>
                        {status === "low" && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Bajo
                          </Badge>
                        )}
                        {status === "normal" && <Badge variant="default">Normal</Badge>}
                        {status === "high" && <Badge variant="secondary">Alto</Badge>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          // simple prompt-based editor for min/max/reorder
                          const min = window.prompt("Min stock:", String(stock.minStock || 0))
                          if (min === null) return
                          const max = window.prompt("Max stock:", String(stock.maxStock || 1000))
                          if (max === null) return
                          const reorder = window.prompt("Punto de reorden:", String(stock.reorderPoint || 0))
                          if (reorder === null) return

                          try {
                            await updateInventoryStock({
                              productId: stock.productId,
                              warehouseId: warehouseId as string,
                              minStock: Number(min),
                              maxStock: Number(max),
                              reorderPoint: Number(reorder),
                            })
                            // revalidate inventory
                            // mutate is available via hook but quick way: reload page or you can call window.location.reload()
                            window.location.reload()
                          } catch (err) {
                            console.error("Error updating inventory settings", err)
                            alert("Error actualizando inventario")
                          }
                        }}
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
