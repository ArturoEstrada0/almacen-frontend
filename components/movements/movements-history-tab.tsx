"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockMovements, mockProducts, mockWarehouses } from "@/lib/mock-data"
import { formatCurrency, formatNumber } from "@/lib/utils/format"
import { Search, TrendingUp, TrendingDown, Activity, Download, Filter } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function MovementsHistoryTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterWarehouse, setFilterWarehouse] = useState<string>("all")

  const filteredMovements = mockMovements.filter((movement) => {
    const product = mockProducts.find((p) => p.id === movement.productId)
    const matchesSearch =
      product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || movement.type === filterType
    const matchesWarehouse = filterWarehouse === "all" || movement.warehouseId === filterWarehouse
    return matchesSearch && matchesType && matchesWarehouse
  })

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entrada":
        return <TrendingUp className="h-5 w-5 text-green-500" />
      case "salida":
        return <TrendingDown className="h-5 w-5 text-red-500" />
      case "ajuste":
        return <Activity className="h-5 w-5 text-orange-500" />
      case "traspaso":
        return <Activity className="h-5 w-5 text-blue-500" />
      case "transformacion":
        return <Activity className="h-5 w-5 text-purple-500" />
      default:
        return <Activity className="h-5 w-5" />
    }
  }

  const getMovementBadgeVariant = (type: string) => {
    switch (type) {
      case "entrada":
        return "default"
      case "salida":
        return "destructive"
      default:
        return "secondary"
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filtros Avanzados
          </Button>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por producto o notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="salida">Salida</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
                <SelectItem value="traspaso">Traspaso</SelectItem>
                <SelectItem value="transformacion">Transformación</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Almacén" />
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial Completo</CardTitle>
          <CardDescription>
            {filteredMovements.length} movimiento{filteredMovements.length !== 1 ? "s" : ""} encontrado
            {filteredMovements.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Costo Unitario</TableHead>
                <TableHead>Costo Total</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.map((movement) => {
                const product = mockProducts.find((p) => p.id === movement.productId)
                const warehouse = mockWarehouses.find((w) => w.id === movement.warehouseId)

                return (
                  <TableRow key={movement.id}>
                    <TableCell className="text-sm">
                      {movement.createdAt.toLocaleDateString()}
                      <br />
                      <span className="text-xs text-muted-foreground">{movement.createdAt.toLocaleTimeString()}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(movement.type)}
                        <Badge variant={getMovementBadgeVariant(movement.type)}>{movement.type}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{product?.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>{warehouse?.name}</TableCell>
                    <TableCell className="font-medium">
                      <span
                        className={
                          movement.type === "salida" || (movement.type === "ajuste" && movement.quantity < 0)
                            ? "text-red-500"
                            : "text-green-500"
                        }
                      >
                        {movement.type === "salida" || (movement.type === "ajuste" && movement.quantity < 0)
                          ? "-"
                          : "+"}
                        {formatNumber(Math.abs(movement.quantity))}
                      </span>
                    </TableCell>
                    <TableCell>{movement.unitCost ? formatCurrency(movement.unitCost) : "-"}</TableCell>
                    <TableCell className="font-medium">
                      {movement.totalCost ? formatCurrency(movement.totalCost) : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{movement.lotNumber || "-"}</TableCell>
                    <TableCell className="text-sm">{movement.userName}</TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground line-clamp-2">{movement.notes || "-"}</p>
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
