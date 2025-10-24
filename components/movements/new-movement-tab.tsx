"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockProducts, mockWarehouses } from "@/lib/mock-data"
import { TrendingUp, TrendingDown } from "lucide-react"

export function NewMovementTab() {
  const [movementType, setMovementType] = useState<string>("entrada")

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Entrada de Inventario</CardTitle>
          <CardDescription>Registrar productos que ingresan al almacén</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-in">Producto *</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {mockProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouse-in">Almacén Destino *</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar almacén" />
              </SelectTrigger>
              <SelectContent>
                {mockWarehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity-in">Cantidad *</Label>
              <Input id="quantity-in" type="number" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-cost-in">Costo Unitario</Label>
              <Input id="unit-cost-in" type="number" placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lot-in">Número de Lote</Label>
              <Input id="lot-in" placeholder="LOT-2024-001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiration-in">Fecha de Vencimiento</Label>
              <Input id="expiration-in" type="date" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-in">Ubicación</Label>
            <Input id="location-in" placeholder="A1-05" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes-in">Notas</Label>
            <Textarea id="notes-in" placeholder="Observaciones adicionales..." />
          </div>

          <Button className="w-full">
            <TrendingUp className="mr-2 h-4 w-4" />
            Registrar Entrada
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salida de Inventario</CardTitle>
          <CardDescription>Registrar productos que salen del almacén</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-out">Producto *</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {mockProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouse-out">Almacén Origen *</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar almacén" />
              </SelectTrigger>
              <SelectContent>
                {mockWarehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity-out">Cantidad *</Label>
            <Input id="quantity-out" type="number" placeholder="0" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason-out">Motivo de Salida *</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">Venta</SelectItem>
                <SelectItem value="return">Devolución</SelectItem>
                <SelectItem value="damaged">Producto Dañado</SelectItem>
                <SelectItem value="expired">Producto Vencido</SelectItem>
                <SelectItem value="sample">Muestra</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-out">Referencia</Label>
            <Input id="reference-out" placeholder="Número de venta, orden, etc." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes-out">Notas</Label>
            <Textarea id="notes-out" placeholder="Observaciones adicionales..." />
          </div>

          <Button className="w-full" variant="destructive">
            <TrendingDown className="mr-2 h-4 w-4" />
            Registrar Salida
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
