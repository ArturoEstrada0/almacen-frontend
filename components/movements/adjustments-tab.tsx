"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockProducts, mockWarehouses } from "@/lib/mock-data"
import { Settings } from "lucide-react"

export function AdjustmentsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajuste de Inventario</CardTitle>
        <CardDescription>Corregir diferencias en el stock físico vs sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="product-adjust">Producto *</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar producto" />
            </SelectTrigger>
            <SelectContent>
              {mockProducts.map((product, index) => (
                <SelectItem key={product.id + "-" + index} value={product.id}>
                  {product.name} ({product.sku})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="warehouse-adjust">Almacén *</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar almacén" />
            </SelectTrigger>
            <SelectContent>
              {mockWarehouses.map((warehouse, index) => (
                <SelectItem key={warehouse.id + "-" + index} value={warehouse.id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="current-quantity">Cantidad en Sistema</Label>
            <Input id="current-quantity" type="number" placeholder="0" disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="physical-quantity">Cantidad Física *</Label>
            <Input id="physical-quantity" type="number" placeholder="0" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason-adjust">Motivo del Ajuste *</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar motivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inventory">Inventario Físico</SelectItem>
              <SelectItem value="damaged">Producto Dañado</SelectItem>
              <SelectItem value="expired">Producto Vencido</SelectItem>
              <SelectItem value="lost">Producto Extraviado</SelectItem>
              <SelectItem value="found">Producto Encontrado</SelectItem>
              <SelectItem value="error">Error de Registro</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes-adjust">Notas *</Label>
          <Textarea id="notes-adjust" placeholder="Explicación detallada del ajuste..." />
        </div>

        <Button className="w-full">
          <Settings className="mr-2 h-4 w-4" />
          Registrar Ajuste
        </Button>
      </CardContent>
    </Card>
  )
}
