"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { useProducts } from "@/lib/hooks/use-products"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { createPurchaseOrder, usePurchaseOrders } from "@/lib/hooks/use-purchase-orders"
import { formatCurrency } from "@/lib/utils/format"
import { Plus, Trash2, Save } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface PurchaseOrderItem {
  productId: string
  quantity: number
  unitPrice: number
}

interface NewPurchaseOrderTabProps {
  onSuccess: () => void
}

export function NewPurchaseOrderTab({ onSuccess }: NewPurchaseOrderTabProps) {
  const [supplierId, setSupplierId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("")
  const [items, setItems] = useState<PurchaseOrderItem[]>([])
  const [notes, setNotes] = useState("")

  const addItem = () => {
    setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  }

  const calculateTax = () => {
    return calculateSubtotal() * 0.16
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const { mutate } = usePurchaseOrders()

  const { suppliers } = useSuppliers()
  const { products } = useProducts()
  const { warehouses } = useWarehouses()

  const handleSubmit = async () => {
    if (!supplierId || !warehouseId || !expectedDeliveryDate || items.length === 0) {
      toast.error("Por favor completa todos los campos requeridos")
      return
    }

    try {
      const payload = {
        supplierId,
        warehouseId,
        expectedDate: expectedDeliveryDate,
        notes,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          notes: undefined,
        })),
      }

      await createPurchaseOrder(payload)
      toast.success("Orden de compra creada exitosamente")
      mutate()
      onSuccess()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Error creando la orden de compra")
    }
  }

  const supplier = suppliers.find((s) => s.id === supplierId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Nueva Orden de Compra</h2>
        <p className="text-sm text-muted-foreground">Crea una nueva orden de compra a proveedor</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
          <CardDescription>Datos básicos de la orden de compra</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proveedor *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
              {supplier && (
                <p className="text-xs text-muted-foreground">
                  Días de crédito: {supplier.paymentTerms} días • RFC: {supplier.rfc}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Almacén de Destino *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un almacén" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha de Entrega Esperada *</Label>
              <Input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              placeholder="Observaciones o instrucciones especiales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Productos</CardTitle>
              <CardDescription>Agrega los productos a la orden de compra</CardDescription>
            </div>
            <Button onClick={addItem} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Producto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No hay productos agregados</p>
              <Button onClick={addItem} variant="outline" className="mt-4 bg-transparent">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Primer Producto
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio Unitario</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {items.map((item, index) => {
                  const product = products.find((p) => p.id === item.productId)
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Select value={item.productId} onValueChange={(value) => updateItem(index, "productId", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products
                              .filter((p) => p.type === "insumo")
                              .map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} ({product.sku})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {product && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Stock actual: {product.minStock} • Precio sugerido: {formatCurrency(product.costPrice)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", Number.parseInt(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, "unitPrice", Number.parseFloat(e.target.value) || 0)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {items.length > 0 && (
            <div className="flex justify-end gap-8 border-t pt-4 mt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="text-lg font-medium">{formatCurrency(calculateSubtotal())}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">IVA (16%)</p>
                <p className="text-lg font-medium">{formatCurrency(calculateTax())}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{formatCurrency(calculateTotal())}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>
          <Save className="mr-2 h-4 w-4" />
          Crear Orden de Compra
        </Button>
      </div>
    </div>
  )
}
