"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ComboBox } from "@/components/ui/combobox"
import { Settings, Loader2 } from "lucide-react"
import { useProducts } from "@/lib/hooks/use-products"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { apiGet, apiPost } from "@/lib/db/localApi"
import { useToast } from "@/hooks/use-toast"

export function AdjustmentsTab() {
  const { products } = useProducts()
  const { warehouses } = useWarehouses()
  const { toast } = useToast()

  const [selectedProduct, setSelectedProduct] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState("")
  const [currentStock, setCurrentStock] = useState<number | null>(null)
  const [physicalQuantity, setPhysicalQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Obtener el stock actual cuando se selecciona producto y almacén
  useEffect(() => {
    async function fetchStock() {
      if (!selectedProduct || !selectedWarehouse) {
        setCurrentStock(null)
        return
      }

      try {
        setLoading(true)
        const inventory = await apiGet(`/inventory/warehouse/${selectedWarehouse}`)
        const inventoryItem = Array.isArray(inventory)
          ? inventory.find((item: any) => String(item.product?.id || item.productId) === String(selectedProduct))
          : null
        
        setCurrentStock(inventoryItem ? Number(inventoryItem.quantity || 0) : 0)
      } catch (err) {
        console.error("Error fetching stock:", err)
        setCurrentStock(0)
      } finally {
        setLoading(false)
      }
    }

    fetchStock()
  }, [selectedProduct, selectedWarehouse])

  const handleSave = async () => {
    if (!selectedProduct || !selectedWarehouse || !physicalQuantity || !reason) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    const physical = Number(physicalQuantity)
    const current = currentStock || 0
    const difference = physical - current

    if (difference === 0) {
      toast({
        title: "Sin cambios",
        description: "La cantidad física es igual a la cantidad en sistema",
      })
      return
    }

    try {
      setSaving(true)
      
      // Crear movimiento de ajuste
      await apiPost("/inventory/movements", {
        type: "ajuste",
        warehouseId: selectedWarehouse,
        notes: `${reason}: ${notes}`.trim(),
        items: [{
          productId: selectedProduct,
          quantity: Math.abs(difference),
          // Si la diferencia es positiva, es entrada; si es negativa, es salida
          adjustmentType: difference > 0 ? "entrada" : "salida",
        }],
      })

      toast({
        title: "Ajuste registrado",
        description: `Se ${difference > 0 ? "agregaron" : "retiraron"} ${Math.abs(difference)} unidades`,
      })

      // Limpiar formulario
      setSelectedProduct("")
      setSelectedWarehouse("")
      setPhysicalQuantity("")
      setReason("")
      setNotes("")
      setCurrentStock(null)
    } catch (err) {
      console.error("Error saving adjustment:", err)
      toast({
        title: "Error",
        description: (err as any)?.message || "Error al registrar el ajuste",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const difference = physicalQuantity && currentStock !== null
    ? Number(physicalQuantity) - currentStock
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajuste de Inventario</CardTitle>
        <CardDescription>Corregir diferencias en el stock físico vs sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Producto *</Label>
          <ComboBox
            value={selectedProduct}
            onChange={setSelectedProduct}
            options={products.map((product) => ({
              value: product.id,
              label: `${product.sku} - ${product.name}`,
              subtitle: product.sku
            }))}
            placeholder="Seleccionar producto"
            searchPlaceholder="Buscar producto..."
            emptyMessage="No se encontró el producto"
          />
        </div>

        <div className="space-y-2">
          <Label>Almacén *</Label>
          <ComboBox
            value={selectedWarehouse}
            onChange={setSelectedWarehouse}
            options={warehouses.map((warehouse) => ({
              value: warehouse.id,
              label: warehouse.name
            }))}
            placeholder="Seleccionar almacén"
            searchPlaceholder="Buscar almacén..."
            emptyMessage="No se encontró el almacén"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cantidad en Sistema</Label>
            <div className="relative">
              <Input
                type="number"
                value={currentStock !== null ? currentStock : ""}
                placeholder={loading ? "Cargando..." : "Selecciona producto y almacén"}
                disabled
                className="bg-muted"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cantidad Física *</Label>
            <Input
              type="number"
              placeholder="0"
              value={physicalQuantity}
              onChange={(e) => setPhysicalQuantity(e.target.value)}
            />
          </div>
        </div>

        {difference !== null && difference !== 0 && (
          <div className={`p-3 rounded-lg ${difference > 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <p className={`text-sm font-medium ${difference > 0 ? "text-green-700" : "text-red-700"}`}>
              Diferencia: {difference > 0 ? "+" : ""}{difference} unidades
              ({difference > 0 ? "Entrada por ajuste" : "Salida por ajuste"})
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Motivo del Ajuste *</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar motivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Inventario Físico">Inventario Físico</SelectItem>
              <SelectItem value="Producto Dañado">Producto Dañado</SelectItem>
              <SelectItem value="Producto Vencido">Producto Vencido</SelectItem>
              <SelectItem value="Producto Extraviado">Producto Extraviado</SelectItem>
              <SelectItem value="Producto Encontrado">Producto Encontrado</SelectItem>
              <SelectItem value="Error de Registro">Error de Registro</SelectItem>
              <SelectItem value="Otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Notas *</Label>
          <Textarea
            placeholder="Explicación detallada del ajuste..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <Button
          className="w-full"
          onClick={handleSave}
          disabled={!selectedProduct || !selectedWarehouse || !physicalQuantity || !reason || saving}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Settings className="mr-2 h-4 w-4" />
          )}
          Registrar Ajuste
        </Button>
      </CardContent>
    </Card>
  )
}
