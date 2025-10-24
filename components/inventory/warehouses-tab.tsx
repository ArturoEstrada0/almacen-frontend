"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockWarehouses, mockStock, mockProducts } from "@/lib/mock-data"
import { formatCurrency, formatNumber } from "@/lib/utils/format"
import { Plus, Warehouse, MapPin, Edit, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function WarehousesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const getWarehouseStats = (warehouseId: string) => {
    const warehouseStock = mockStock.filter((s) => s.warehouseId === warehouseId)
    const totalProducts = warehouseStock.length
    const totalValue = warehouseStock.reduce((sum, stock) => {
      const product = mockProducts.find((p) => p.id === stock.productId)
      return sum + (product?.costPrice || 0) * stock.quantity
    }, 0)
    const totalQuantity = warehouseStock.reduce((sum, stock) => sum + stock.quantity, 0)

    return { totalProducts, totalValue, totalQuantity }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Almacén
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Almacén</DialogTitle>
                <DialogDescription>Ingresa los datos del almacén</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código *</Label>
                    <Input id="code" placeholder="ALM-001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input id="name" placeholder="Almacén Central" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación *</Label>
                  <Input id="location" placeholder="Dirección completa" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" placeholder="Descripción del almacén" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>Guardar Almacén</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {mockWarehouses.map((warehouse) => {
          const stats = getWarehouseStats(warehouse.id)

          return (
            <Card key={warehouse.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Warehouse className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{warehouse.name}</CardTitle>
                      <CardDescription className="font-mono">{warehouse.code}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                    {warehouse.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{warehouse.location}</span>
                </div>

                {warehouse.description && <p className="text-sm text-muted-foreground">{warehouse.description}</p>}

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Productos</p>
                    <p className="text-2xl font-bold">{stats.totalProducts}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unidades</p>
                    <p className="text-2xl font-bold">{formatNumber(stats.totalQuantity)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="text-lg font-bold">{formatCurrency(stats.totalValue)}</p>
                  </div>
                </div>

                {warehouse.zones && warehouse.zones.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Zonas</p>
                    <div className="flex flex-wrap gap-2">
                      {warehouse.zones.map((zone) => (
                        <Badge key={zone.id} variant="outline">
                          {zone.name} ({zone.aisles.length} pasillos)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
