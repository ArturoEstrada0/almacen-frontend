"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { ComboBox } from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Eye, Trash2, Printer, Pencil } from "lucide-react"
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/db/localApi"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"

interface AssignmentItem {
  id: number
  productId: string
  quantity: number
  unitPrice: number
}

export function InputAssignmentsTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<any>(null)
  const [selectedProducer, setSelectedProducer] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState("")
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split("T")[0])
  const [trackingFolio, setTrackingFolio] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedItems, setSelectedItems] = useState<AssignmentItem[]>([])

  const [producers, setProducers] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const [pRes, wRes, prodRes, assignmentsRes] = await Promise.all([
          apiGet("/producers"),
          apiGet("/warehouses"),
          apiGet("/products"),
          apiGet("/producers/input-assignments/all"),
        ])
        if (!mounted) return
        setProducers(Array.isArray(pRes) ? pRes : [])
        setWarehouses(Array.isArray(wRes) ? wRes : [])
        setProducts(Array.isArray(prodRes) ? prodRes : [])
        setAssignments(Array.isArray(assignmentsRes) ? assignmentsRes : [])
      } catch (err) {
        console.error("Error loading input assignments data:", err)
      } finally {
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const addItem = () =>
    setSelectedItems((s) => [...s, { id: Date.now(), productId: "", quantity: 0, unitPrice: 0 }])
  const removeItem = (id: number) => setSelectedItems((s) => s.filter((it) => it.id !== id))
  const updateItem = (id: number, patch: Partial<AssignmentItem>) =>
    setSelectedItems((s) => s.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  const generateFolio = () => {
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 900 + 100)
    return `${year}${month}${day}-${random}`
  }

  const handleCloseDialog = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      // Resetear formulario al cerrar
      setIsEditMode(false)
      setEditingAssignment(null)
      setSelectedProducer("")
      setSelectedWarehouse("")
      setAssignmentDate(new Date().toISOString().split("T")[0])
      setTrackingFolio("")
      setNotes("")
      setSelectedItems([])
      setSaveError("")
    }
  }

  const handleOpenDialog = () => {
    setTrackingFolio(generateFolio())
    setIsEditMode(false)
    setEditingAssignment(null)
    setIsDialogOpen(true)
  }

  const handleEditAssignment = (assignment: any) => {
    setIsEditMode(true)
    setEditingAssignment(assignment)
    setSelectedProducer(String(assignment.producerId))
    setSelectedWarehouse(String(assignment.warehouseId))
    setAssignmentDate(assignment.date || assignment.assignmentDate)
    setTrackingFolio(assignment.trackingFolio || "")
    setNotes(assignment.notes || "")
    
    // Cargar items de la asignación
    const items = (assignment.items || []).map((item: any) => ({
      id: item.id || Date.now() + Math.random(),
      productId: item.productId || item.product?.id,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }))
    setSelectedItems(items)
    setIsDialogOpen(true)
  }

  const handleDeleteAssignment = async (assignment: any) => {
    if (!confirm(`¿Estás seguro de eliminar la asignación ${assignment.code || assignment.assignmentNumber}? Esta acción no se puede deshacer.`)) {
      return
    }
    
    try {
      await apiDelete(`/producers/input-assignments/${assignment.id}`)
      
      setAssignments((prev) => prev.filter((a) => a.id !== assignment.id))
      
      toast({
        title: "Éxito",
        description: "Asignación eliminada correctamente",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: (err as any)?.message || "Error al eliminar la asignación",
        variant: "destructive",
      })
    }
  }

  const calculateTotal = () => selectedItems.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0)

  // Estado para mostrar error en pantalla
  const [saveError, setSaveError] = useState("")

  const handleSave = async () => {
    setSaveError("")
    try {
      setSaving(true)
      const payload = {
        producerId: Number(selectedProducer) || selectedProducer,
        warehouseId: Number(selectedWarehouse) || selectedWarehouse,
        date: assignmentDate,
        trackingFolio,
        notes,
        items: selectedItems.map((it) => ({ productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })),
      }
      
      if (isEditMode && editingAssignment) {
        // Modo edición
        const updated = await apiPatch(`/producers/input-assignments/${editingAssignment.id}`, payload)
        setAssignments((prev) => prev.map((a) => a.id === updated.id ? updated : a))
        toast({
          title: "Éxito",
          description: "Asignación actualizada correctamente",
        })
      } else {
        // Modo creación
        const created = await apiPost("/producers/input-assignments", payload)
        setAssignments((prev) => [created, ...(prev || [])])
        toast({
          title: "Éxito",
          description: "Asignación creada correctamente",
        })
      }
      
      // reset
      setIsEditMode(false)
      setEditingAssignment(null)
      setSelectedProducer("")
      setSelectedWarehouse("")
      setAssignmentDate(new Date().toISOString().split("T")[0])
      setTrackingFolio("")
      setNotes("")
      setSelectedItems([])
      setIsDialogOpen(false)
    } catch (err) {
      const msg = (err as any)?.message || String(err)
      if (msg.includes("Insufficient stock")) {
        setSaveError("No hay suficiente stock para uno o más insumos asignados.")
      } else {
        setSaveError(msg)
      }
      toast({
        title: "Error",
        description: msg,
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredAssignments = assignments.filter((a) => {
    const q = searchTerm.toLowerCase()
    const producer = producers.find((p) => String(p.id) === String(a.producerId))
    const code = (a.code || a.assignmentNumber || "").toString().toLowerCase()
    return code.includes(q) || (producer?.name || "").toLowerCase().includes(q)
  })

  const insumoProducts = products.filter((p) => p.type !== "fruta")

  // Estado para mostrar error por item
  const [itemStockErrors, setItemStockErrors] = useState<Record<number, string>>({})

  // Validar stock de cada item al cambiar cantidad o producto
  async function checkItemStock(item: AssignmentItem) {
    if (!item.productId || !selectedWarehouse || !item.quantity) return
    try {
      const inventory = await apiGet(`/inventory/warehouse/${selectedWarehouse}`)
      const invItem = Array.isArray(inventory)
        ? inventory.find((i: any) => i.product?.id === item.productId)
        : null
      const stock = invItem ? Number(invItem.quantity) : 0
      setItemStockErrors(prev => ({
        ...prev,
        [item.id]: item.quantity > stock ? `No hay suficiente stock para este insumo. Solo hay ${stock} disponibles.` : ""
      }))
    } catch {
      setItemStockErrors(prev => ({ ...prev, [item.id]: "" }))
    }
  }

  // Efecto para validar stock de todos los items
  useEffect(() => {
    selectedItems.forEach(item => {
      checkItemStock(item)
    })
  }, [selectedItems, selectedWarehouse])

  // Estado para el modal de detalles
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // Handler para ver detalles
  const handleViewAssignment = (assignment: any) => {
    setSelectedAssignment(assignment)
    setIsViewDialogOpen(true)
  }

  // Handler para imprimir
  const handlePrintAssignment = (assignment: any) => {
    // Aquí puedes implementar la lógica de impresión real
    window.print() // Esto imprime la página actual, puedes personalizarlo
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Asignación de Insumos</CardTitle>
            <CardDescription>Registra la entrega de insumos a productores (genera movimiento en contra)</CardDescription>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Asignación
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Editar Asignación" : "Nueva Asignación"}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Productor *</Label>
                    <ComboBox
                      value={selectedProducer}
                      onChange={setSelectedProducer}
                      options={producers.map((p) => ({
                        value: String(p.id),
                        label: `${p.code} - ${p.name}`,
                        subtitle: p.code
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
                      options={warehouses.map((w) => ({
                        value: String(w.id),
                        label: w.name
                      }))}
                      placeholder="Seleccionar almacén"
                      searchPlaceholder="Buscar almacén..."
                      emptyMessage="No se encontró el almacén"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha *</Label>
                    <Input type="date" value={assignmentDate} onChange={(e) => setAssignmentDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Folio de Seguimiento</Label>
                    <Input 
                      type="text" 
                      value={trackingFolio} 
                      onChange={(e) => setTrackingFolio(e.target.value.toUpperCase())}
                      placeholder="YYMMDD-XXX"
                      maxLength={10}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">Formato: YYMMDD-XXX (auto-generado, editable)</p>
                  </div>
                </div>

                <div>
                  <Label>Items</Label>
                  <div className="space-y-2">
                    {selectedItems.map((it) => (
                      <div key={it.id} className="grid grid-cols-4 gap-2">
                        <ComboBox
                          value={it.productId}
                          onChange={(v) => updateItem(it.id, { productId: v })}
                          options={insumoProducts.map((p) => ({
                            value: String(p.id),
                            label: `${p.sku} - ${p.name}`,
                            subtitle: p.sku
                          }))}
                          placeholder="Seleccionar producto"
                          searchPlaceholder="Buscar producto..."
                          emptyMessage="No se encontró el producto"
                        />
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={it.quantity === 0 ? "" : String(it.quantity)}
                          onChange={e => {
                            const value = e.target.value
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              updateItem(it.id, { quantity: value === "" ? 0 : Number(value) })
                              checkItemStock({ ...it, quantity: value === "" ? 0 : Number(value) })
                            }
                          }}
                          placeholder="Cantidad"
                        />
                        {itemStockErrors[it.id] && (
                          <div className="text-xs text-destructive font-semibold mt-1">{itemStockErrors[it.id]}</div>
                        )}
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={it.unitPrice === 0 ? "" : String(it.unitPrice)}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              updateItem(it.id, { unitPrice: value === "" ? 0 : Number(value) })
                            }
                          }}
                          placeholder="Precio unitario"
                        />
                        <div className="flex items-center">
                          <Button variant="ghost" onClick={() => removeItem(it.id)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" onClick={addItem}>
                      Añadir item
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-destructive">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={!selectedProducer || !selectedWarehouse || selectedItems.length === 0 || saving}>
                  {saving ? "Guardando..." : isEditMode ? "Actualizar Asignación" : "Guardar Asignación"}
                </Button>
                {saveError && (
                  <div className="text-xs text-destructive font-semibold mt-2">{saveError}</div>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                <TableHead>Número</TableHead>
                <TableHead>Folio Seguimiento</TableHead>
                <TableHead>Productor</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((assignment) => {
                const producer = producers.find((p) => String(p.id) === String(assignment.producerId))
                const warehouse = warehouses.find((w) => String(w.id) === String(assignment.warehouseId))
                return (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.code || assignment.assignmentNumber}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded">{assignment.trackingFolio || '-'}</span>
                    </TableCell>
                    <TableCell>{producer?.name}</TableCell>
                    <TableCell>{warehouse?.name}</TableCell>
                    <TableCell>{formatDate(assignment.date || assignment.assignmentDate)}</TableCell>
                    <TableCell className="font-semibold text-destructive">{formatCurrency(Number(assignment.total) || 0)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" title="Imprimir nota" onClick={() => handlePrintAssignment(assignment)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Ver detalles" onClick={() => handleViewAssignment(assignment)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Editar asignación" onClick={() => handleEditAssignment(assignment)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Eliminar asignación" 
                          onClick={() => handleDeleteAssignment(assignment)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
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
            <DialogTitle className="text-2xl">Detalles de Asignación</DialogTitle>
            <DialogDescription>Información completa de la asignación de insumos</DialogDescription>
          </DialogHeader>
          {selectedAssignment && (() => {
            const producer = producers.find(p => String(p.id) === String(selectedAssignment.producerId))
            const warehouse = warehouses.find(w => String(w.id) === String(selectedAssignment.warehouseId))
            
            return (
              <div className="space-y-6 py-4">
                {/* Información principal */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
                  <div>
                    <Label className="text-xs text-muted-foreground">Código de Asignación</Label>
                    <p className="font-mono font-semibold text-lg">{selectedAssignment.code || selectedAssignment.assignmentNumber}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Folio de Seguimiento</Label>
                    <p className="font-mono font-semibold text-lg">{selectedAssignment.trackingFolio || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha de Asignación</Label>
                    <p className="font-semibold">{formatDate(selectedAssignment.date || selectedAssignment.assignmentDate)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <p className="font-bold text-xl text-destructive">{formatCurrency(Number(selectedAssignment.total) || 0)}</p>
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

                {/* Items asignados */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Insumos Asignados</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="font-semibold">Producto</TableHead>
                          <TableHead className="text-center font-semibold">Cantidad</TableHead>
                          <TableHead className="text-right font-semibold">Precio Unit.</TableHead>
                          <TableHead className="text-right font-semibold">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedAssignment.items || []).map((item: any, idx: number) => {
                          const product = products.find(p => String(p.id) === String(item.productId))
                          const quantity = Number(item.quantity)
                          const unitPrice = Number(item.price || item.unitPrice || 0)
                          const subtotal = quantity * unitPrice
                          
                          return (
                            <TableRow key={idx}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{product?.name || item.product?.name || 'Producto desconocido'}</p>
                                  {product?.sku && (
                                    <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-mono">{quantity}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(unitPrice)}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">{formatCurrency(subtotal)}</TableCell>
                            </TableRow>
                          )
                        })}
                        <TableRow className="bg-slate-50 font-bold">
                          <TableCell colSpan={3} className="text-right">TOTAL</TableCell>
                          <TableCell className="text-right text-lg text-destructive">
                            {formatCurrency(Number(selectedAssignment.total) || 0)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Notas */}
                {selectedAssignment.notes && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <Label className="text-sm font-semibold mb-2 block">Notas</Label>
                    <p className="text-sm whitespace-pre-wrap">{selectedAssignment.notes}</p>
                  </div>
                )}

                {/* Información de auditoría */}
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground pt-4 border-t">
                  <div>
                    <Label className="text-xs">Creado</Label>
                    <p>{selectedAssignment.createdAt ? formatDate(selectedAssignment.createdAt) : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Última actualización</Label>
                    <p>{selectedAssignment.updatedAt ? formatDate(selectedAssignment.updatedAt) : '-'}</p>
                  </div>
                </div>
              </div>
            )
          })()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Cerrar
            </Button>
            <Button variant="default" onClick={() => {
              if (selectedAssignment) {
                handlePrintAssignment(selectedAssignment)
              }
            }}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
