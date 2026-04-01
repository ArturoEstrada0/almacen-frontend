"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { useProducts } from "@/lib/hooks/use-products"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { cancelPurchaseOrder, createPurchaseOrder, updatePurchaseOrder, usePurchaseOrders } from "@/lib/hooks/use-purchase-orders"
import { formatCurrency } from "@/lib/utils/format"
import type { PurchaseOrder } from "@/lib/types"
import { Plus, Trash2, Save } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface PurchaseOrderItem {
  productId: string
  quantity: number
  unitPrice: number
}

interface NewPurchaseOrderTabProps {
  onSuccess: () => void
  mode?: "create" | "edit"
  initialOrder?: PurchaseOrder | null
  onCancelEdit?: () => void
}

export function NewPurchaseOrderTab({
  onSuccess,
  mode = "create",
  initialOrder = null,
  onCancelEdit,
}: NewPurchaseOrderTabProps) {
  const [supplierId, setSupplierId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("")
  const [creditDays, setCreditDays] = useState(0)
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

  useEffect(() => {
    if (mode !== "edit" || !initialOrder) {
      setSupplierId("")
      setWarehouseId("")
      setExpectedDeliveryDate("")
      setCreditDays(0)
      setItems([])
      setNotes("")
      return
    }

    setSupplierId(initialOrder.supplierId || "")
    setWarehouseId(initialOrder.warehouseId || "")
    setExpectedDeliveryDate(initialOrder.expectedDeliveryDate ? String(initialOrder.expectedDeliveryDate).split("T")[0] : "")
    setCreditDays(initialOrder.creditDays || 0)
    setNotes(initialOrder.notes || "")
    setItems(
      (initialOrder.items || []).map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity || 0),
        unitPrice: Number((it as any).unitPrice ?? (it as any).price ?? 0),
      })),
    )
  }, [mode, initialOrder])

  const handleSubmit = async () => {
    if (mode === "create" && (!supplierId || !warehouseId || !expectedDeliveryDate || items.length === 0)) {
      toast.error("Por favor completa todos los campos requeridos")
      return
    }

    if (mode === "edit" && (!supplierId || !warehouseId || !expectedDeliveryDate || items.length === 0 || !initialOrder?.id)) {
      toast.error("Faltan campos obligatorios para actualizar la orden")
      return
    }

    const hasInvalidItems = items.some(
      (it) => !it.productId || Number(it.quantity) <= 0 || Number.isNaN(Number(it.quantity)) || Number(it.unitPrice) < 0 || Number.isNaN(Number(it.unitPrice)),
    )
    if (hasInvalidItems) {
      toast.error("Revisa los productos: cada renglón debe tener producto, cantidad mayor a 0 y precio válido")
      return
    }

    try {
      if (mode === "edit" && initialOrder?.id) {
        const payload = {
          supplierId,
          warehouseId,
          expectedDate: expectedDeliveryDate,
          creditDays,
          notes,
          items: items.map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
          })),
        }
        await updatePurchaseOrder(initialOrder.id, payload)
        toast.success("Orden de compra actualizada exitosamente")
      } else {
        const payload = {
          supplierId,
          warehouseId,
          expectedDate: expectedDeliveryDate,
          creditDays,
          notes,
          items: items.map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            notes: undefined,
          })),
        }

        await createPurchaseOrder(payload)
        toast.success("Orden de compra creada exitosamente")
      }

      mutate()
      onSuccess()
    } catch (e: any) {
      const errorMessage = Array.isArray(e?.message)
        ? e.message.join(" • ")
        : e?.message || e?.technicalDetails || (mode === "edit" ? "Error actualizando la orden de compra" : "Error creando la orden de compra")
      toast.error(errorMessage)
    }
  }

  const handleCancelOrder = async () => {
    if (mode !== "edit" || !initialOrder?.id) return

    try {
      await cancelPurchaseOrder(initialOrder.id)
      toast.success("Orden de compra cancelada")
      mutate()
      onSuccess()
    } catch (e: any) {
      const errorMessage = e?.message || e?.technicalDetails || "Error al cancelar la orden"
      toast.error(errorMessage)
    }
  }

  const supplier = suppliers.find((s) => s.id === supplierId)
  
  // Actualizar creditDays cuando se selecciona un proveedor
  const handleSupplierChange = (value: string) => {
    setSupplierId(value)
    const selectedSupplier = suppliers.find((s) => s.id === value)
    if (selectedSupplier) {
      setCreditDays(selectedSupplier.paymentTerms || 0)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{mode === "edit" ? `Editar Orden ${initialOrder?.orderNumber || ""}` : "Nueva Orden de Compra"}</h2>
        <p className="text-sm text-muted-foreground">
          {mode === "edit" ? "Modifica productos y cantidades de la orden" : "Crea una nueva orden de compra a proveedor"}
        </p>
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
              {mode === "edit" ? (
                <div>
                  <p className="font-medium">{supplier?.name || "-"}</p>
                  <p className="text-xs text-muted-foreground">Para cambiar proveedor, cancela esta orden y crea una nueva</p>
                </div>
              ) : (
                <Select value={supplierId} onValueChange={handleSupplierChange}>
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
              )}
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
            
            <div className="space-y-2">
              <Label>Días de Crédito</Label>
              <Input
                type="number"
                min="0"
                value={creditDays}
                onChange={(e) => setCreditDays(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                La fecha de vencimiento se calculará automáticamente
              </p>
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

      <div className="flex items-center justify-between gap-2">
        <div>
          {mode === "edit" && initialOrder?.status !== "cancelada" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Cancelar orden</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿De seguro que quieres cancelar esta orden? Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Volver</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelOrder}>Sí, cancelar orden</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => (mode === "edit" ? onCancelEdit?.() : onSuccess())}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="mr-2 h-4 w-4" />
            {mode === "edit" ? "Guardar Cambios" : "Crear Orden de Compra"}
          </Button>
        </div>
      </div>
    </div>
  )
}
