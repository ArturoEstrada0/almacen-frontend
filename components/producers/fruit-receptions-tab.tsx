"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ComboBox } from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { Plus, Search, Eye, Printer, Edit, Trash2, Upload } from "lucide-react"
import { apiGet, apiPost } from "@/lib/db/localApi"
import { formatDate, formatCurrency } from "@/lib/utils/format"
import { 
  updateFruitReception as apiUpdateFruitReception, 
  deleteFruitReception as apiDeleteFruitReception 
} from "@/lib/hooks/use-producers"
import { ProtectedCreate, ProtectedUpdate, ProtectedDelete } from "@/components/auth/protected-action"

interface ReturnedItem {
  id: number
  productId: string
  quantity: number
  unitPrice: number
}

export function FruitReceptionsTab() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingReceptionId, setEditingReceptionId] = useState<string | null>(null)
  const [selectedProducer, setSelectedProducer] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [receptionDate, setReceptionDate] = useState(new Date().toISOString().split("T")[0])
  const [boxes, setBoxes] = useState("")
  const [weightPerBox, setWeightPerBox] = useState("")
  const [trackingFolio, setTrackingFolio] = useState("")
  const [returnedBoxes, setReturnedBoxes] = useState("")
  const [returnedBoxesValue, setReturnedBoxesValue] = useState("")
  const [returnedItems, setReturnedItems] = useState<ReturnedItem[]>([])
  const [notes, setNotes] = useState("")

  const [producers, setProducers] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [receptions, setReceptions] = useState<any[]>([])

  // Estado para el modal de detalles
  const [selectedReception, setSelectedReception] = useState<any | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [pRes, wRes, prodRes, recRes] = await Promise.all([
          apiGet("/api/producers"),
          apiGet("/api/warehouses"),
          apiGet("/api/products"),
          apiGet("/api/producers/fruit-receptions/all"),
        ])
        if (!mounted) return
        setProducers(Array.isArray(pRes) ? pRes : [])
        setWarehouses(Array.isArray(wRes) ? wRes : [])
        setProducts(Array.isArray(prodRes) ? prodRes : [])
        setReceptions(Array.isArray(recRes) ? recRes : [])
      } catch (err) {
        console.error("Error loading receptions:", err)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const fruitProducts = products.filter((p) => p.type === "fruta")
  const insumoProducts = products.filter((p) => p.type === "insumo")

  const filteredReceptions = receptions.filter((reception) => {
    const q = searchTerm.toLowerCase()
    const producer = producers.find((p) => p.id === reception.producerId)
    return (reception.code || reception.receptionNumber || "").toLowerCase().includes(q) || (producer?.name || "").toLowerCase().includes(q)
  })

  const totalWeight = boxes && weightPerBox ? Number(boxes) * Number(weightPerBox) : 0

  const addReturnedItem = () =>
    setReturnedItems((s) => [...s, { id: Date.now(), productId: "", quantity: 0, unitPrice: 0 }])
  
  const removeReturnedItem = (id: number) => setReturnedItems((s) => s.filter((it) => it.id !== id))
  
  const updateReturnedItem = (id: number, patch: Partial<ReturnedItem>) =>
    setReturnedItems((s) => s.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  const calculateReturnedTotal = () => 
    returnedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)

  const handleSave = async () => {
    try {
      const payload: any = {
        producerId: selectedProducer,
        productId: selectedProduct,
        warehouseId: selectedWarehouse,
        boxes: Number(boxes),
        date: receptionDate,
        trackingFolio: trackingFolio || undefined,
      }
      
      // Agregar campos opcionales solo si tienen valor
      if (weightPerBox) payload.weightPerBox = Number(weightPerBox)
      if (totalWeight) payload.totalWeight = Number(totalWeight.toFixed(2))
      
      // Si hay items devueltos, usar el nuevo sistema
      if (returnedItems.length > 0) {
        const returnedTotal = calculateReturnedTotal()
        payload.returnedBoxesValue = returnedTotal
        payload.returnedItems = returnedItems.map(item => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice)
        }))
      } else {
        // Fallback al sistema viejo para compatibilidad
        if (returnedBoxes) payload.returnedBoxes = Number(returnedBoxes)
        if (returnedBoxesValue) payload.returnedBoxesValue = Number(returnedBoxesValue)
      }
      
      if (notes) payload.notes = notes
      
      if (isEditMode && editingReceptionId) {
        // Actualizar recepción existente
        const updated = await apiUpdateFruitReception(editingReceptionId, payload)
        setReceptions((prev) => prev.map((r) => (r.id === editingReceptionId ? updated : r)))
      } else {
        // Crear nueva recepción
        const created = await apiPost("/api/producers/fruit-receptions", payload)
        setReceptions((prev) => [created, ...(prev || [])])
      }
      
      resetForm()
    } catch (err) {
      console.error("Error saving reception:", err)
      alert("Error: " + (err as any)?.message || String(err))
    }
  }

  const resetForm = () => {
    setSelectedProducer("")
    setSelectedWarehouse("")
    setSelectedProduct("")
    setReceptionDate(new Date().toISOString().split("T")[0])
    setBoxes("")
    setWeightPerBox("")
    setTrackingFolio("")
    setReturnedBoxes("")
    setReturnedBoxesValue("")
    setReturnedItems([])
    setNotes("")
    setIsDialogOpen(false)
    setIsEditMode(false)
    setEditingReceptionId(null)
  }

  const handleEditReception = (reception: any) => {
    setIsEditMode(true)
    setEditingReceptionId(reception.id)
    setSelectedProducer(reception.producerId)
    setSelectedWarehouse(reception.warehouseId)
    setSelectedProduct(reception.productId)
    setReceptionDate(reception.date)
    setBoxes(String(reception.boxes))
    setWeightPerBox(String(reception.weightPerBox || ""))
    setTrackingFolio(reception.trackingFolio || "")
    setReturnedBoxes(String(reception.returnedBoxes || ""))
    setReturnedBoxesValue(String(reception.returnedBoxesValue || ""))
    
    // Cargar items devueltos si existen
    if (reception.returnedItems && Array.isArray(reception.returnedItems)) {
      const items = reception.returnedItems.map((item: any) => ({
        id: item.id || Date.now() + Math.random(),
        productId: String(item.productId),
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || item.price || 0),
      }))
      setReturnedItems(items)
    } else {
      setReturnedItems([])
    }
    
    setNotes(reception.notes || "")
    setIsDialogOpen(true)
  }

  const handleDeleteReception = async (reception: any) => {
    if (reception.shipmentStatus !== "pendiente") {
      alert("No se puede eliminar una recepción que ya ha sido embarcada o vendida")
      return
    }

    if (!confirm(`¿Estás seguro de eliminar la recepción ${reception.code || reception.receptionNumber}?`)) {
      return
    }

    try {
      await apiDeleteFruitReception(reception.id)
      setReceptions((prev) => prev.filter((r) => r.id !== reception.id))
    } catch (err) {
      console.error("Error deleting reception:", err)
      alert("Error al eliminar: " + (err as any)?.message || String(err))
    }
  }

  const getShipmentStatusBadge = (status: string) => {
    switch (status) {
      case "pendiente":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            Pendiente Embarque
          </Badge>
        )
      case "embarcada":
        return (
          <Badge variant="secondary" className="text-blue-600 border-blue-600">
            Embarcada
          </Badge>
        )
      case "vendida":
        return (
          <Badge variant="default" className="text-green-600 border-green-600">
            Vendida
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "pagada":
        return (
          <Badge variant="default" className="bg-green-500 text-white">
            Pagada
          </Badge>
        )
      case "pendiente":
      default:
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            Pendiente
          </Badge>
        )
    }
  }

  // Handler para ver detalles
  const handleViewReception = (reception: any) => {
    setSelectedReception(reception)
    setIsViewDialogOpen(true)
  }

  // Handler para imprimir
  const handlePrintReception = (reception: any) => {
    window.print() // Personaliza si necesitas formato especial
  }

  const handleImport = () => {
    router.push('/import-export?type=fruit-receptions')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recepción de Fruta</CardTitle>
            <CardDescription>Registra la entrega de fruta por parte de productores (sin ajuste de cuenta hasta venta)</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <ProtectedCreate module="producers">
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Recepción
                  </Button>
                </DialogTrigger>
              </ProtectedCreate>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{isEditMode ? "Editar Recepción de Fruta" : "Nueva Recepción de Fruta"}</DialogTitle>
                </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Productor *</Label>
                    <ComboBox
                      value={selectedProducer}
                      onChange={setSelectedProducer}
                      options={producers.map((producer) => ({
                        value: producer.id,
                        label: `${producer.code} - ${producer.name}`,
                        subtitle: producer.code
                      }))}
                      placeholder="Seleccionar productor"
                      searchPlaceholder="Buscar productor..."
                      emptyMessage="No se encontró el productor"
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
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Recepción *</Label>
                  <Input id="date" type="date" value={receptionDate} onChange={(e) => setReceptionDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Folio de Seguimiento (Opcional)</Label>
                  <Input 
                    placeholder="TRK-XXXXX-XXXX" 
                    value={trackingFolio} 
                    onChange={(e) => setTrackingFolio(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Ingresa el folio de la asignación de insumos para vincular</p>
                </div>

                <div className="space-y-2">
                  <Label>Producto (Fruta) *</Label>
                  <ComboBox
                    value={selectedProduct}
                    onChange={setSelectedProduct}
                    options={fruitProducts.map((product) => ({
                      value: product.id,
                      label: `${product.sku} - ${product.name}`,
                      subtitle: product.sku
                    }))}
                    placeholder="Seleccionar producto"
                    searchPlaceholder="Buscar producto..."
                    emptyMessage="No se encontró el producto"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Cajas *</Label>
                    <Input type="text" inputMode="numeric" placeholder="0" value={boxes} onChange={(e) => setBoxes(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Peso por Caja (kg)</Label>
                    <Input type="text" inputMode="decimal" placeholder="0.00" value={weightPerBox} onChange={(e) => setWeightPerBox(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Peso Total (kg)</Label>
                  <Input value={totalWeight.toFixed(2)} disabled className="bg-muted" />
                </div>

                {/* Sección de Devolución de Material de Empaque */}
                <div className="border-t pt-4 mt-4">
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-primary">Devolución de Material e Insumos</h4>
                    <p className="text-xs text-muted-foreground">Si el productor devuelve material o insumos, registra aquí para generar un abono en su cuenta</p>
                  </div>
                  
                  <div className="space-y-3">
                    {returnedItems.map((item) => {
                      const itemTotal = item.quantity * item.unitPrice
                      return (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="col-span-5">
                            <Label className="text-xs mb-1 block">Producto/Insumo</Label>
                            <ComboBox
                              value={item.productId}
                              onChange={(v) => updateReturnedItem(item.id, { productId: v })}
                              options={insumoProducts.map((p) => ({
                                value: String(p.id),
                                label: `${p.sku} - ${p.name}`,
                                subtitle: p.sku
                              }))}
                              placeholder="Seleccionar"
                              searchPlaceholder="Buscar..."
                              emptyMessage="No encontrado"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs mb-1 block">Cantidad</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={item.quantity === 0 ? "" : String(item.quantity)}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                  updateReturnedItem(item.id, { quantity: value === "" ? 0 : Number(value) })
                                }
                              }}
                              placeholder="0"
                              className="text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs mb-1 block">Precio Unit.</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={item.unitPrice === 0 ? "" : String(item.unitPrice)}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                  updateReturnedItem(item.id, { unitPrice: value === "" ? 0 : Number(value) })
                                }
                              }}
                              placeholder="0.00"
                              className="text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs mb-1 block">Total</Label>
                            <Input
                              value={formatCurrency(itemTotal)}
                              disabled
                              className="bg-white text-sm font-semibold"
                            />
                          </div>
                          <div className="col-span-1 flex items-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeReturnedItem(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={addReturnedItem}
                      className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Item Devuelto
                    </Button>
                    
                    {returnedItems.length > 0 && (
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm font-semibold text-green-800">Total Abono por Devolución:</span>
                        <span className="text-lg font-bold text-green-700">{formatCurrency(calculateReturnedTotal())}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={!selectedProducer || !selectedWarehouse || !selectedProduct || !boxes}>
                  {isEditMode ? "Actualizar Recepción" : "Guardar Recepción"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por número o productor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio Seguimiento</TableHead>
                <TableHead>Productor</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cajas</TableHead>
                <TableHead>Peso Total</TableHead>
                <TableHead>Estado Embarque</TableHead>
                <TableHead>Estado Pago</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceptions.map((reception) => {
                const producer = producers.find((p) => p.id === reception.producerId)
                const product = products.find((p) => p.id === reception.productId)
                return (
                  <TableRow key={reception.id}>
                    <TableCell>
                      {reception.trackingFolio ? (
                        <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded">{reception.trackingFolio}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{producer?.name}</TableCell>
                    <TableCell>{product?.name}</TableCell>
                    <TableCell>{reception.boxes}</TableCell>
                    <TableCell>{reception.totalWeight} kg</TableCell>
                    <TableCell>{getShipmentStatusBadge(reception.shipmentStatus || "pendiente")}</TableCell>
                    <TableCell>{getPaymentStatusBadge(reception.paymentStatus || "pendiente")}</TableCell>
                    <TableCell>{formatDate(reception.date || reception.receptionDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {reception.shipmentStatus === "pendiente" && (
                          <>
                            <ProtectedUpdate module="producers">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Editar recepción" 
                                onClick={() => handleEditReception(reception)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </ProtectedUpdate>
                            <ProtectedDelete module="producers">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Eliminar recepción" 
                                onClick={() => handleDeleteReception(reception)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </ProtectedDelete>
                          </>
                        )}
                        <Button variant="ghost" size="sm" title="Imprimir recibo" onClick={() => handlePrintReception(reception)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Ver detalles" onClick={() => handleViewReception(reception)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Detalles de Recepción de Fruta</DialogTitle>
            <DialogDescription>Información completa de la recepción</DialogDescription>
          </DialogHeader>
          {selectedReception && (() => {
            const producer = producers.find(p => String(p.id) === String(selectedReception.producerId))
            const warehouse = warehouses.find(w => String(w.id) === String(selectedReception.warehouseId))
            const product = products.find(p => String(p.id) === String(selectedReception.productId))
            const totalWeight = Number(selectedReception.totalWeight || 0)
            const boxes = Number(selectedReception.boxes || 0)
            const weightPerBox = boxes > 0 ? (totalWeight / boxes).toFixed(2) : '0.00'
            
            return (
              <div className="space-y-6 py-4">
                {/* Información principal */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
                  <div>
                    <Label className="text-xs text-muted-foreground">Código de Recepción</Label>
                    <p className="font-mono font-semibold text-lg">{selectedReception.code || selectedReception.receptionNumber}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Folio de Seguimiento</Label>
                    <p className="font-mono font-semibold text-lg">{selectedReception.trackingFolio || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha de Recepción</Label>
                    <p className="font-semibold">{formatDate(selectedReception.date || selectedReception.receptionDate)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Estado de Envío</Label>
                    <div className="mt-1">
                      {getShipmentStatusBadge(selectedReception.shipmentStatus || 'pendiente')}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Estado de Pago</Label>
                    <div className="mt-1">
                      {getPaymentStatusBadge(selectedReception.paymentStatus || 'pendiente')}
                    </div>
                  </div>
                </div>

                {/* Información de Productor y Almacén */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <Label className="text-sm font-semibold text-muted-foreground mb-2 block">Productor</Label>
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">{producer?.name || '-'}</p>
                      {producer?.code && (
                        <p className="text-sm text-muted-foreground">Código: {producer.code}</p>
                      )}
                      {producer?.phone && (
                        <p className="text-sm text-muted-foreground">Teléfono: {producer.phone}</p>
                      )}
                      {producer?.email && (
                        <p className="text-sm text-muted-foreground">Email: {producer.email}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <Label className="text-sm font-semibold text-muted-foreground mb-2 block">Almacén</Label>
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">{warehouse?.name || '-'}</p>
                      {warehouse?.address && (
                        <p className="text-sm text-muted-foreground">Dirección: {warehouse.address}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Información del Producto y Cantidades */}
                <div className="p-4 border rounded-lg bg-linear-to-br from-green-50 to-emerald-50">
                  <Label className="text-sm font-semibold text-muted-foreground mb-3 block">Producto Recibido</Label>
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold text-xl text-green-800">{product?.name || 'Producto desconocido'}</p>
                      {product?.sku && (
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 pt-3 border-t border-green-200">
                      <div className="text-center">
                        <Label className="text-xs text-muted-foreground block mb-1">Cajas Recibidas</Label>
                        <p className="font-bold text-2xl text-green-700">{boxes}</p>
                      </div>
                      <div className="text-center">
                        <Label className="text-xs text-muted-foreground block mb-1">Peso Total</Label>
                        <p className="font-bold text-2xl text-green-700">{totalWeight} kg</p>
                      </div>
                      <div className="text-center">
                        <Label className="text-xs text-muted-foreground block mb-1">Peso por Caja</Label>
                        <p className="font-bold text-2xl text-green-700">{weightPerBox} kg</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Devolución de Material */}
                {(selectedReception.returnedBoxes > 0 || selectedReception.returnedBoxesValue > 0) && (
                  <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <Label className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-600 text-white">Devolución</Badge>
                      Material de Empaque Devuelto
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Cajas Devueltas</Label>
                        <p className="font-bold text-xl text-blue-700">{selectedReception.returnedBoxes || 0}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Valor del Material</Label>
                        <p className="font-bold text-xl text-blue-700">
                          ${Number(selectedReception.returnedBoxesValue || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-sm text-green-600 font-medium flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Abono registrado automáticamente en la cuenta del productor
                      </p>
                    </div>
                  </div>
                )}

                {/* Notas */}
                {selectedReception.notes && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <Label className="text-sm font-semibold mb-2 block">Notas</Label>
                    <p className="text-sm whitespace-pre-wrap">{selectedReception.notes}</p>
                  </div>
                )}

                {/* Información de auditoría */}
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground pt-4 border-t">
                  <div>
                    <Label className="text-xs">Creado</Label>
                    <p>{selectedReception.createdAt ? formatDate(selectedReception.createdAt) : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Última actualización</Label>
                    <p>{selectedReception.updatedAt ? formatDate(selectedReception.updatedAt) : '-'}</p>
                  </div>
                </div>
              </div>
            )
          })()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Cerrar
            </Button>
            <Button variant="default">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
