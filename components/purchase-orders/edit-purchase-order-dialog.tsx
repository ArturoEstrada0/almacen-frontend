"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ComboBox } from "@/components/ui/combobox"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { useProducts } from "@/lib/hooks/use-products"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { updatePurchaseOrder } from "@/lib/hooks/use-purchase-orders"
import { formatCurrency } from "@/lib/utils/format"
import { Plus, Trash2, Save } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface Props {
  order: any
  onClose: () => void
  onUpdated: () => void
}

interface Item {
  id?: string
  productId: string
  quantity: number
  unitPrice: number
}

export default function EditPurchaseOrderDialog({ order, onClose, onUpdated }: Props) {
  const { suppliers } = useSuppliers()
  const { products } = useProducts()
  const { warehouses } = useWarehouses()

  const [supplierId, setSupplierId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("")
  const [creditDays, setCreditDays] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const [notes, setNotes] = useState("")

  const normalizeType = (value: string | null | undefined) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

  const selectedWarehouse = useMemo(
    () => warehouses.find((warehouse: any) => String(warehouse.id) === String(warehouseId)),
    [warehouses, warehouseId],
  )

  const productOptions = useMemo(() => {
    const selectedWarehouseType = normalizeType((selectedWarehouse as any)?.type)

    return products
      .filter((product: any) => product?.isActive !== false)
      .filter((product: any) => {
        if (!selectedWarehouseType) return true
        const productType = normalizeType(product?.type)
        if (!productType) return true
        return productType === selectedWarehouseType
      })
      .map((product: any) => ({
        value: product.id,
        label: `${product.name} (${product.sku})`,
        subtitle: product.sku,
      }))
  }, [products, selectedWarehouse])

  useEffect(() => {
    if (!order) return
    setSupplierId(order.supplierId)
    setWarehouseId(order.warehouseId)
    setExpectedDeliveryDate(order.expectedDeliveryDate ? order.expectedDeliveryDate.split("T")[0] : "")
    setCreditDays(order.creditDays || 0)
    setNotes(order.notes || "")
    setItems(order.items.map((it: any) => ({ id: it.id, productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })))
  }, [order])

  const addItem = () => setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }])
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))
  const updateItem = (index: number, field: keyof Item, value: any) => {
    const newItems = [...items]
    ;(newItems[index] as any)[field] = value
    setItems(newItems)
  }

  const calculateSubtotal = () => items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0)
  const calculateItemTax = (item: Item) => {
    const product = products.find((p) => p.id === item.productId)
    const appliesIva = product ? product.hasIva16 !== false : true
    if (!appliesIva) return 0
    return item.quantity * item.unitPrice * 0.16
  }
  const calculateTax = () =>
    items.reduce((sum, item) => sum + calculateItemTax(item), 0)
  const calculateTotal = () => calculateSubtotal() + calculateTax()

  const handleSubmit = async () => {
    if (!warehouseId || items.length === 0) {
      toast.error("Por favor completa los campos requeridos")
      return
    }

    const hasInvalidItems = items.some(
      (it) => !it.productId || Number(it.quantity) <= 0 || Number.isNaN(Number(it.quantity)) || Number(it.unitPrice) < 0,
    )
    if (hasInvalidItems) {
      toast.error("Revisa los productos: cada renglón debe tener producto, cantidad mayor a 0 y precio válido")
      return
    }

    try {
      const payload = {
        warehouseId,
        notes,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
      }

      await updatePurchaseOrder(order.id, payload)
      toast.success("Orden de compra actualizada")
      onUpdated()
      onClose()
    } catch (e: any) {
      const errorMessage = Array.isArray(e?.message)
        ? e.message.join(" • ")
        : e?.message || "Error al actualizar la orden"
      toast.error(errorMessage)
    }
  }

  const supplier = suppliers.find((s) => s.id === supplierId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Editar Orden {order?.orderNumber}</h2>
        <p className="text-sm text-muted-foreground">Modifica los productos y cantidades. No es posible cambiar el proveedor.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
          <CardDescription>Datos básicos de la orden de compra</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <p className="font-medium">{suppliers.find((s) => s.id === supplierId)?.businessName || suppliers.find((s) => s.id === supplierId)?.name}</p>
              <p className="text-xs text-muted-foreground">El proveedor no puede modificarse desde esta pantalla</p>
            </div>

            <div className="space-y-2">
              <Label>Almacén de Destino *</Label>
              <ComboBox
                options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                value={warehouseId}
                onChange={setWarehouseId}
                placeholder="Selecciona un almacén"
                searchPlaceholder="Buscar almacén..."
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha de Entrega Esperada</Label>
              <DatePicker value={expectedDeliveryDate} onChange={(v) => setExpectedDeliveryDate(v)} />
            </div>

            <div className="space-y-2">
              <Label>Días de Crédito</Label>
              <Input type="number" min="0" value={creditDays} onChange={(e) => setCreditDays(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Productos</CardTitle>
              <CardDescription>Modifica productos y cantidades</CardDescription>
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
                  <TableHead>IVA</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => {
                  const product = products.find((p) => p.id === item.productId)
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <ComboBox
                          options={productOptions}
                          value={item.productId}
                          onChange={(v) => updateItem(idx, "productId", v)}
                          placeholder="Selecciona un producto"
                          searchPlaceholder="Buscar producto..."
                        />
                        {product && <p className="text-xs text-muted-foreground mt-1">Stock: {product.minStock}</p>}
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number.parseInt(e.target.value || "0"))} className="w-24" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} step={0.01} value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", Number.parseFloat(e.target.value || "0"))} className="w-32" placeholder="0.00" />
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(calculateItemTax(item))}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
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
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit}><Save className="mr-2 h-4 w-4" />Guardar Cambios</Button>
      </div>
    </div>
  )
}
