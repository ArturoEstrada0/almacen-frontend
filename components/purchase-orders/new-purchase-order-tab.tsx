"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ComboBox } from "@/components/ui/combobox"
import { useSuppliers, useSupplierProducts } from "@/lib/hooks/use-suppliers"
import { useProducts } from "@/lib/hooks/use-products"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { cancelPurchaseOrder, createPurchaseOrder, updatePurchaseOrder, usePurchaseOrders } from "@/lib/hooks/use-purchase-orders"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import { formatCurrency, formatCurrencyWithDenomination } from "@/lib/utils/format"
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
import InvoiceImportForm from "@/components/invoice-import/InvoiceImportForm"

interface PurchaseOrderItem {
  productId: string
  quantity: number
  unitPrice: number
  currency?: "MXN" | "USD"
}

interface QuotationOption {
  id: string
  code: string
  status: string
  winningSupplierId?: string | null
  validUntil?: string | null
  notes?: string | null
  supplierTokens?: Array<{
    supplierId: string
    supplier?: {
      id: string
      name: string
    }
  }>
  items?: Array<{
    id: string
    productId: string
    quantity: number
    notes?: string | null
    supplierResponses?: Array<{
      supplierId: string
      price: number
      currency?: "MXN" | "USD"
      available?: boolean
      notes?: string | null
    }>
  }>
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
  const [selectedQuotationId, setSelectedQuotationId] = useState("")
  const [selectedQuotationDetail, setSelectedQuotationDetail] = useState<QuotationOption | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const infoCardRef = useRef<HTMLDivElement>(null)

  const [showImporter, setShowImporter] = useState(false)

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

  const calculateItemTax = (item: PurchaseOrderItem) => {
    const product = products.find((p) => p.id === item.productId)
    const appliesIva = product ? product.hasIva16 !== false : true
    if (!appliesIva) return 0
    return item.quantity * item.unitPrice * 0.16
  }

  const calculateTax = () => {
    return items.reduce((sum, item) => sum + calculateItemTax(item), 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const { mutate } = usePurchaseOrders()

  const { suppliers } = useSuppliers()
  const { products } = useProducts()
  const { warehouses } = useWarehouses()
  const { supplierProducts } = useSupplierProducts(supplierId || null)
  const { data: quotations = [] } = useSWR<QuotationOption[]>(
    mode === "create" ? "purchase-order-quotations" : null,
    () => ApiClient.get<QuotationOption[]>(API_ENDPOINTS.quotations.list()),
  )

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

  const selectedQuotation = useMemo(
    () => selectedQuotationDetail || quotations.find((quotation) => quotation.id === selectedQuotationId),
    [quotations, selectedQuotationDetail, selectedQuotationId],
  )

  const orderCurrency = useMemo<"MXN" | "USD">(() => {
    const direct = (initialOrder as any)?.currency || selectedQuotationDetail?.items?.[0]?.supplierResponses?.find((response) => response.available !== false)?.currency || selectedQuotation?.items?.[0]?.supplierResponses?.find((response) => response.available !== false)?.currency
    return direct === "USD" ? "USD" : "MXN"
  }, [initialOrder, selectedQuotation, selectedQuotationDetail])

  const eligibleQuotations = useMemo(
    () => {
      if (!supplierId) return []

      return quotations.filter((quotation) => {
        const isApproved = ["cerrada", "aprobada", "aceptada", "completada"].includes(String(quotation.status || "").toLowerCase())
        const hasWinner = !!quotation.winningSupplierId
        const matchesWinner = String(quotation.winningSupplierId || "") === String(supplierId)

        return isApproved && hasWinner && matchesWinner
      })
    },
    [quotations, supplierId],
  )

  const baseProductOptions = useMemo(() => {
    const selectedWarehouseType = normalizeType((selectedWarehouse as any)?.type)

    let baseProducts: any[]
    if (supplierId && supplierProducts.length > 0) {
      baseProducts = supplierProducts.map((sp: any) => sp.product).filter(Boolean)
    } else if (supplierId && supplierProducts.length === 0) {
      baseProducts = []
    } else {
      baseProducts = products
    }

    return baseProducts
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
  }, [products, supplierProducts, supplierId, selectedWarehouse])

  const getProductOptionsForRow = (currentIndex: number) => {
    const selectedInOtherRows = new Set(
      items.filter((_, i) => i !== currentIndex && items[i].productId).map((it) => it.productId),
    )
    return baseProductOptions.filter((opt) => !selectedInOtherRows.has(opt.value))
  }

  const addItem = () => {
    setItems([...items, { productId: "", quantity: 1, unitPrice: 0, currency: orderCurrency }])
  }

  function handleImportComplete(result: any) {
    // Map imported items into current items array
    const importedItems = (result.items || []).map((it: any) => ({ productId: it.productId || "", quantity: Number(it.quantity) || 1, unitPrice: Number(it.unitPrice) || 0 }))
    setSupplierId(result.supplierId || supplierId)
    setWarehouseId(result.warehouseId || warehouseId)
    setItems((cur) => [...cur, ...importedItems.map((it: any) => ({ ...it, currency: orderCurrency }))])
    setShowImporter(false)
  }

  useEffect(() => {
    if (mode !== "edit" || !initialOrder) {
      setSupplierId("")
      setWarehouseId("")
      setExpectedDeliveryDate("")
      setCreditDays(0)
      setItems([])
      setNotes("")
      setSelectedQuotationId("")
      return
    }

    setSupplierId(initialOrder.supplierId || "")
    setWarehouseId(initialOrder.warehouseId || "")
    setExpectedDeliveryDate(initialOrder.expectedDeliveryDate ? String(initialOrder.expectedDeliveryDate).split("T")[0] : "")
    setCreditDays(initialOrder.creditDays || 0)
    setNotes(initialOrder.notes || "")
    setSelectedQuotationId(initialOrder.quotationId || "")
    setItems(
      (initialOrder.items || []).map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity || 0),
        unitPrice: Number((it as any).unitPrice ?? (it as any).price ?? 0),
        currency: (it as any).currency || initialOrder.currency || "MXN",
      })),
    )
  }, [mode, initialOrder])

  useEffect(() => {
    if (mode !== "create" || !selectedQuotationId || !supplierId) {
      setSelectedQuotationDetail(null)
      return
    }

    let cancelled = false

    const fetchQuotationDetail = async () => {
      try {
        const quotationDetail = await ApiClient.get<QuotationOption>(API_ENDPOINTS.quotations.get(selectedQuotationId))
        if (!cancelled) {
          setSelectedQuotationDetail(quotationDetail)
        }
      } catch (error) {
        console.error("Error loading quotation detail:", error)
        if (!cancelled) {
          setSelectedQuotationDetail(null)
        }
      }
    }

    fetchQuotationDetail()

    return () => {
      cancelled = true
    }
  }, [mode, selectedQuotationId, supplierId])

  useEffect(() => {
    if (mode !== "create" || !selectedQuotation) return

    if (selectedQuotation.winningSupplierId && selectedQuotation.winningSupplierId !== supplierId) {
      setSupplierId(selectedQuotation.winningSupplierId)
    }

    const quotationSupplierId =
      selectedQuotation.winningSupplierId ||
      supplierId ||
      selectedQuotation.supplierTokens?.[0]?.supplierId ||
      ""

    const quotationItems = (selectedQuotation.items || []).map((item) => {
      const response = (item.supplierResponses || []).find(
        (r) => String(r.supplierId) === String(quotationSupplierId) && r.available !== false,
      )

      return {
        productId: item.productId,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(response?.price ?? 0),
        currency: response?.currency || "MXN",
      }
    })

    setItems(quotationItems)
    setNotes((current) => current || selectedQuotation.notes || "")
  }, [mode, selectedQuotation, supplierId, suppliers])

  const handleSubmit = async () => {
    setSubmitted(true)
    if (!supplierId || !warehouseId || !expectedDeliveryDate || items.length === 0) {
      toast.error("Por favor completa todos los campos requeridos")
      // Scroll hasta el card de información general dentro del contenedor del layout
      infoCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }

    try {
      const payload = {
        supplierId,
        warehouseId,
        expectedDate: expectedDeliveryDate,
        creditDays,
        notes,
        currency: orderCurrency,
        quotationId: selectedQuotationId || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          currency: it.currency || orderCurrency,
          notes: undefined,
        })),
      }

      if (mode === "edit" && initialOrder?.id) {
        await updatePurchaseOrder(initialOrder.id, payload)
        toast.success("Orden de compra actualizada exitosamente")
      } else {
        await createPurchaseOrder(payload)
        toast.success("Orden de compra creada exitosamente")
      }

      mutate()
      onSuccess()
    } catch (e: any) {
      // Log full error for debugging (server may return structured info)
      console.error("Purchase order save error:", e)

      // Prefer structured backend message when available
      const backendMessage = e?.raw?.message || e?.message || e?.technicalDetails
      const errorMessage = Array.isArray(backendMessage)
        ? backendMessage.join(" • ")
        : backendMessage || (mode === "edit" ? "Error actualizando la orden de compra" : "Error creando la orden de compra")

      // If there's a raw payload, include it in console for inspection
      if (e?.raw && typeof e.raw !== "string") {
        console.info("Backend error payload:", e.raw)
      }

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
  
  const handleSupplierChange = (value: string) => {
    if (value !== supplierId) {
      setItems([])
      setSelectedQuotationId("")
      setSelectedQuotationDetail(null)
    }
    setSupplierId(value)
    const selectedSupplier = suppliers.find((s) => s.id === value)
    if (selectedSupplier) {
      setCreditDays(selectedSupplier.paymentTerms || 0)
    }
  }

  const handleQuotationChange = (value: string) => {
    if (!supplierId) {
      toast.error("Primero selecciona un proveedor")
      return
    }

    setSelectedQuotationId(value)
    const quotation = quotations.find((item) => item.id === value)
    if (!quotation) return

    if (quotation.winningSupplierId) {
      setSupplierId(quotation.winningSupplierId)
      const selectedSupplier = suppliers.find((s) => s.id === quotation.winningSupplierId)
      if (selectedSupplier) {
        setCreditDays(selectedSupplier.paymentTerms || 0)
      }
    }
  }

  return (
    <div className="space-y-6">
      <Card ref={infoCardRef}>
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
                <ComboBox
                  options={suppliers.map((s) => ({ value: s.id, label: s.name, subtitle: s.rfc }))}
                  value={supplierId}
                  onChange={handleSupplierChange}
                  placeholder="Selecciona un proveedor"
                  searchPlaceholder="Buscar proveedor..."
                  className={submitted && !supplierId ? 'border-red-500 ring-1 ring-red-500' : ''}
                />
              )}
              {submitted && !supplierId
                ? <p className="text-xs text-red-500">Selecciona un proveedor para continuar</p>
                : supplier && <p className="text-xs text-muted-foreground">Días de crédito: {supplier.paymentTerms} días • RFC: {supplier.rfc}</p>
              }
            </div>

            <div className="space-y-2">
              <Label>Almacén de Destino *</Label>
              <ComboBox
                options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                value={warehouseId}
                onChange={setWarehouseId}
                placeholder="Selecciona un almacén"
                searchPlaceholder="Buscar almacén..."
                className={submitted && !warehouseId ? 'border-red-500 ring-1 ring-red-500' : ''}
              />
              {submitted && !warehouseId && (
                <p className="text-xs text-red-500">Selecciona un almacén de destino</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Fecha de Entrega Esperada *</Label>
              <DatePicker
                value={expectedDeliveryDate}
                onChange={(v) => setExpectedDeliveryDate(v)}
                className={submitted && !expectedDeliveryDate ? 'border-red-500 ring-1 ring-red-500' : ''}
              />
              {submitted && !expectedDeliveryDate && (
                <p className="text-xs text-red-500">Indica la fecha de entrega esperada</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Días de Crédito</Label>
              <Input
                type="number"
                min="0"
                value={creditDays}
                onChange={(e) => setCreditDays(Number(e.target.value))}
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

      {mode === "create" && (eligibleQuotations.length > 0 || selectedQuotationId) ? (
        <Card>
          <CardHeader>
            <CardTitle>Cotización vinculada</CardTitle>
            <CardDescription>Selecciona una cotización con proveedor ganador para copiar sus condiciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cotización aceptada</Label>
              <ComboBox
                options={eligibleQuotations.map((quotation) => ({
                  value: quotation.id,
                  label: quotation.code,
                  subtitle: quotation.supplierTokens?.find((token) => token.supplierId === quotation.winningSupplierId)?.supplier?.name
                    ? `Ganador: ${quotation.supplierTokens?.find((token) => token.supplierId === quotation.winningSupplierId)?.supplier?.name}`
                    : quotation.status,
                }))}
                value={selectedQuotationId}
                onChange={handleQuotationChange}
                placeholder={supplierId ? "Selecciona una cotización aceptada" : "Primero selecciona un proveedor"}
                searchPlaceholder="Buscar cotización..."
                disabled={!supplierId}
                className={!supplierId ? "opacity-70" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Solo se muestran cotizaciones que ya tienen proveedor ganador.
              </p>
            </div>

            {selectedQuotation && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">{selectedQuotation.code}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedQuotation.items?.length || 0} productos • {selectedQuotation.status}
                </p>
                <p className="text-xs text-muted-foreground">
                  Al seleccionar esta cotización, las cantidades y precios se copiarán automáticamente a la orden.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : initialOrder?.quotation ? (
        <Card>
          <CardHeader>
            <CardTitle>Cotización vinculada</CardTitle>
            <CardDescription>Referencia original utilizada para generar esta orden</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{initialOrder.quotation.code}</p>
            <p className="text-xs text-muted-foreground">Estado: {initialOrder.quotation.status}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Productos</CardTitle>
              <CardDescription>Agrega los productos a la orden de compra</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowImporter(true)} size="sm" variant="outline" disabled={!supplierId}>
                Importar XML
              </Button>
              <Button onClick={addItem} size="sm" disabled={!supplierId}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Producto
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showImporter && (
            <div className="mb-4">
              <InvoiceImportForm initialSupplierId={supplierId} initialWarehouseId={warehouseId} onImportComplete={handleImportComplete} />
            </div>
          )}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              {!supplierId ? (
                <p className="text-sm text-muted-foreground">Selecciona un proveedor para agregar productos</p>
              ) : supplierProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Este proveedor no tiene productos asociados</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">No hay productos agregados</p>
                  <Button onClick={addItem} variant="outline" className="mt-4 bg-transparent">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Primer Producto
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
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
                  {items.map((item, index) => {
                    const product = products.find((p) => p.id === item.productId)
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <ComboBox
                            options={getProductOptionsForRow(index)}
                            value={item.productId}
                            onChange={(value) => updateItem(index, "productId", value)}
                            placeholder="Selecciona un producto"
                            searchPlaceholder="Buscar producto..."
                            className="w-full"
                          />
                          {product && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Stock actual: {product.minStock} • Precio sugerido: {formatCurrencyWithDenomination(product.costPrice, product.currency || "MXN")}
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
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrencyWithDenomination(calculateItemTax(item), item.currency || orderCurrency)}</TableCell>
                        <TableCell className="font-medium">{formatCurrencyWithDenomination(item.quantity * item.unitPrice, item.currency || orderCurrency)}</TableCell>
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
            </div>
          )}

          {items.length > 0 && (
            <div className="flex justify-end gap-8 border-t pt-4 mt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="text-lg font-medium">{formatCurrencyWithDenomination(calculateSubtotal(), orderCurrency)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">IVA (16%)</p>
                <p className="text-lg font-medium">{formatCurrencyWithDenomination(calculateTax(), orderCurrency)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{formatCurrencyWithDenomination(calculateTotal(), orderCurrency)}</p>
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
