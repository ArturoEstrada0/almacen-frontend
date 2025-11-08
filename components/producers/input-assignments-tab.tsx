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
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Eye, Trash2, Printer } from "lucide-react"
import { apiGet, apiPost } from "@/lib/db/localApi"
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
  const [selectedProducer, setSelectedProducer] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState("")
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

  const calculateSubtotal = () => selectedItems.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0)
  const calculateTax = () => calculateSubtotal() * 0.16
  const calculateTotal = () => calculateSubtotal() + calculateTax()

  // Estado para mostrar error en pantalla
  const [saveError, setSaveError] = useState("")

  const handleSave = async () => {
    setSaveError("")
    try {
      setSaving(true)
      const payload = {
        producerId: Number(selectedProducer) || selectedProducer,
        warehouseId: Number(selectedWarehouse) || selectedWarehouse,
        notes,
        items: selectedItems.map((it) => ({ productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })),
      }
      const created = await apiPost("/producers/input-assignments", payload)
      setAssignments((prev) => [created, ...(prev || [])])
      // reset
      setSelectedProducer("")
      setSelectedWarehouse("")
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Asignación de Insumos</CardTitle>
            <CardDescription>Registra la entrega de insumos a productores (genera movimiento en contra)</CardDescription>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Asignación
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nueva Asignación</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Productor *</Label>
                    <Select value={selectedProducer} onValueChange={setSelectedProducer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar productor" />
                      </SelectTrigger>
                      <SelectContent>
                        {producers.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.code} - {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Almacén *</Label>
                    <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar almacén" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={String(w.id)}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Items</Label>
                  <div className="space-y-2">
                    {selectedItems.map((it) => (
                      <div key={it.id} className="grid grid-cols-4 gap-2">
                        <Select value={it.productId} onValueChange={(v) => updateItem(it.id, { productId: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {insumoProducts.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.sku} - {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={it.quantity === 0 ? "" : String(it.quantity)}
                          onChange={e => {
                            updateItem(it.id, { quantity: Number(e.target.value) })
                            checkItemStock({ ...it, quantity: Number(e.target.value) })
                          }}
                          placeholder="Cantidad"
                        />
                        {itemStockErrors[it.id] && (
                          <div className="text-xs text-destructive font-semibold mt-1">{itemStockErrors[it.id]}</div>
                        )}
                        <Input
                          type="number"
                          step="0.01"
                          value={it.unitPrice === 0 ? "" : String(it.unitPrice)}
                          onChange={(e) => updateItem(it.id, { unitPrice: Number(e.target.value) })}
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

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IVA (16%):</span>
                    <span className="font-medium">{formatCurrency(calculateTax())}</span>
                  </div>
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
                  {saving ? "Guardando..." : "Guardar Asignación"}
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
                    <TableCell>{producer?.name}</TableCell>
                    <TableCell>{warehouse?.name}</TableCell>
                    <TableCell>{formatDate(assignment.date || assignment.assignmentDate)}</TableCell>
                    <TableCell className="font-semibold text-destructive">{formatCurrency(Number(assignment.total) || 0)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" title="Imprimir nota">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Ver detalles">
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
    </Card>
  )
}
