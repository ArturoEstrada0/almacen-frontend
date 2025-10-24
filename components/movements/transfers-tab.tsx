"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockProducts, mockWarehouses } from "@/lib/mock-data"
import { ArrowLeftRight } from "lucide-react"

export function TransfersTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Traspaso entre Almacenes</CardTitle>
        <CardDescription>Mover productos de un almacén a otro</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="product-transfer">Producto *</Label>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from-warehouse">Almacén Origen *</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar origen" />
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
            <Label htmlFor="to-warehouse">Almacén Destino *</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar destino" />
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity-transfer">Cantidad a Traspasar *</Label>
          <Input id="quantity-transfer" type="number" placeholder="0" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-transfer">Ubicación Destino</Label>
          <Input id="location-transfer" placeholder="A1-05" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes-transfer">Notas</Label>
          <Textarea id="notes-transfer" placeholder="Motivo del traspaso, observaciones..." />
        </div>

        <Button className="w-full">
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          Registrar Traspaso
        </Button>
      </CardContent>
    </Card>
  )
}
