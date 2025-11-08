"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockProducts, mockWarehouses } from "@/lib/mock-data"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiGet } from "@/lib/db/localApi"

export function NewMovementTab() {
  const [movementType, setMovementType] = useState<string>("entrada")
  const { toast } = useToast()
  // Estados para los campos principales
  const [productOut, setProductOut] = useState<string>("")
  const [warehouseOut, setWarehouseOut] = useState<string>("")
  const [quantityOut, setQuantityOut] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [availableStock, setAvailableStock] = useState<number | null>(null)
  // Mensaje de stock insuficiente en pantalla
  const [stockError, setStockError] = useState<string>("")

  // Consultar stock cuando cambian producto, almacén o cantidad
  async function checkStock(productId: string, warehouseId: string, quantity: number) {
    if (!productId || !warehouseId) return
    try {
      const inventory = await apiGet(`/inventory/warehouse/${warehouseId}`)
      const item = Array.isArray(inventory)
        ? inventory.find((i: any) => i.product?.id === productId)
        : null
      const stock = item ? Number(item.quantity) : 0
      setAvailableStock(stock)
      if (quantity > stock) {
        setStockError(`Solo hay ${stock} unidades disponibles en el almacén seleccionado.`)
      } else {
        setStockError("")
      }
    } catch (err) {
      setAvailableStock(null)
      setStockError("")
    }
  }

  // Efecto para validar stock al cambiar cantidad, producto o almacén
  useEffect(() => {
    if (productOut && warehouseOut && quantityOut > 0) {
      checkStock(productOut, warehouseOut, quantityOut)
    } else {
      setStockError("")
    }
  }, [productOut, warehouseOut, quantityOut])

  // Handler para registrar salida
  async function handleRegisterSalida() {
    setLoading(true)
    try {
      const res = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "salida",
          warehouseId: warehouseOut,
          items: [{ productId: productOut, quantity: quantityOut }],
        }),
      })
      if (!res.ok) {
        let data = { message: "" }
        try { data = await res.json() } catch {}
        if (data.message && data.message.includes("Insufficient stock")) {
          toast({
            title: "Error de stock",
            description: "No hay suficiente stock para realizar la salida.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Error",
            description: data.message || "Ocurrió un error al registrar la salida.",
            variant: "destructive"
          })
        }
        setLoading(false)
        return
      }
      toast({
        title: "Salida registrada",
        description: "La salida de inventario se registró correctamente."
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo conectar con el servidor.",
        variant: "destructive"
      })
    }
    setLoading(false)
  }

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

          <Button className="w-full" onClick={handleRegisterEntrada} disabled={loading}>
            <TrendingUp className="mr-2 h-4 w-4" />
            {loading ? "Registrando..." : "Registrar Entrada"}
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
            <Input id="quantity-out" type="number" placeholder="0" value={quantityOut === 0 ? "" : quantityOut} onChange={e => {
              const value = Number(e.target.value)
              setQuantityOut(value)
              // Validar y mostrar error inmediatamente
              if (availableStock !== null && value > availableStock) {
                setStockError(`Solo hay ${availableStock} unidades disponibles en el almacén seleccionado.`)
              } else {
                setStockError("")
              }
            }} />
            {availableStock !== null && (
              <div className="text-xs text-muted-foreground">Stock disponible: {availableStock}</div>
            )}
            {stockError && (
              <div className="text-xs text-destructive font-semibold mt-1">{stockError}</div>
            )}
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

          <Button className="w-full" variant="destructive" onClick={handleRegisterSalida} disabled={loading || !!stockError}>
            <TrendingDown className="mr-2 h-4 w-4" />
            {loading ? "Registrando..." : "Registrar Salida"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
