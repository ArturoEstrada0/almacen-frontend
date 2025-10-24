"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Eye, Trash2, Printer } from "lucide-react"
import { mockInputAssignments, mockProducers, mockWarehouses, mockProducts } from "@/lib/mock-data"
import { formatCurrency, formatDate } from "@/lib/utils/format"

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
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")
  const [selectedItems, setSelectedItems] = useState<AssignmentItem[]>([])

  const insumoProducts = mockProducts.filter((p) => p.type === "insumo")

  const filteredAssignments = mockInputAssignments.filter(
    (assignment) =>
      assignment.assignmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mockProducers
        .find((p) => p.id === assignment.producerId)
        ?.name.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  )

  const addItem = () => {
    setSelectedItems([...selectedItems, { id: Date.now(), productId: "", quantity: 0, unitPrice: 0 }])
  }

  const removeItem = (id: number) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== id))
  }

  const updateItem = (id: number, field: keyof AssignmentItem, value: any) => {
    setSelectedItems(
      selectedItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value }
          // Auto-fill price when product is selected
          if (field === "productId") {
            const product = insumoProducts.find((p) => p.id === value)
            if (product) {
              updated.unitPrice = product.salePrice
            }
          }
          return updated
        }
        return item
      }),
    )
  }

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  }

  const calculateTax = () => {
    return calculateSubtotal() * 0.16
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handleSave = () => {
    console.log("[v0] Saving assignment:", {
      producerId: selectedProducer,
      warehouseId: selectedWarehouse,
      assignmentDate,
      items: selectedItems,
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      total: calculateTotal(),
      notes,
    })
    // Reset form
    setSelectedProducer("")
    setSelectedWarehouse("")
    setAssignmentDate(new Date().toISOString().split("T")[0])
    setNotes("")
    setSelectedItems([])
    setIsDialogOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Asignación de Insumos</CardTitle>
            <CardDescription>
              Registra la entrega de insumos a productores (genera movimiento en contra)
            </CardDescription>
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
                <DialogTitle>Nueva Asignación de Insumos</DialogTitle>
                <DialogDescription>Registra la salida de insumos del almacén hacia un productor</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="producer">Productor *</Label>
                    <Select value={selectedProducer} onValueChange={setSelectedProducer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar productor" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockProducers.map((producer) => (
                          <SelectItem key={producer.id} value={producer.id}>
                            {producer.code} - {producer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warehouse">Almacén *</Label>
                    <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Fecha de Asignación *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={assignmentDate}
                    onChange={(e) => setAssignmentDate(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Productos (Insumos)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Producto
                    </Button>
                  </div>

                  {selectedItems.length > 0 && (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40%]">Producto</TableHead>
                            <TableHead className="w-[15%]">Cantidad</TableHead>
                            <TableHead className="w-[15%]">Precio Unit.</TableHead>
                            <TableHead className="w-[20%]">Subtotal</TableHead>
                            <TableHead className="w-[10%]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.map((item) => {
                            const product = insumoProducts.find((p) => p.id === item.productId)
                            const subtotal = item.quantity * item.unitPrice
                            return (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <Select
                                    value={item.productId}
                                    onValueChange={(value) => updateItem(item.id, "productId", value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {insumoProducts.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                          {product.sku} - {product.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={item.quantity || ""}
                                    onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={item.unitPrice || ""}
                                    onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value))}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{formatCurrency(subtotal)}</div>
                                  {product && (
                                    <div className="text-xs text-muted-foreground">{product.unitOfMeasure}</div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
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
                  <p className="text-xs text-muted-foreground">Este monto se cargará en contra del productor</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    placeholder="Observaciones adicionales..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!selectedProducer || !selectedWarehouse || selectedItems.length === 0}
                >
                  Guardar Asignación
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número o productor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                const producer = mockProducers.find((p) => p.id === assignment.producerId)
                const warehouse = mockWarehouses.find((w) => w.id === assignment.warehouseId)
                return (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.assignmentNumber}</TableCell>
                    <TableCell>{producer?.name}</TableCell>
                    <TableCell>{warehouse?.name}</TableCell>
                    <TableCell>{formatDate(assignment.assignmentDate)}</TableCell>
                    <TableCell className="font-semibold text-destructive">{formatCurrency(assignment.total)}</TableCell>
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
