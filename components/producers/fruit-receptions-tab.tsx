"use client"

import { useEffect, useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Plus, Search, Eye, Printer } from "lucide-react"
import { apiGet, apiPost } from "@/lib/db/localApi"
import { formatDate } from "@/lib/utils/format"

export function FruitReceptionsTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProducer, setSelectedProducer] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [receptionDate, setReceptionDate] = useState(new Date().toISOString().split("T")[0])
  const [boxes, setBoxes] = useState("")
  const [weightPerBox, setWeightPerBox] = useState("")
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

  const filteredReceptions = receptions.filter((reception) => {
    const q = searchTerm.toLowerCase()
    const producer = producers.find((p) => p.id === reception.producerId)
    return (reception.code || reception.receptionNumber || "").toLowerCase().includes(q) || (producer?.name || "").toLowerCase().includes(q)
  })

  const totalWeight = boxes && weightPerBox ? Number(boxes) * Number(weightPerBox) : 0

  const handleSave = async () => {
    try {
      // El backend solo acepta: producerId, warehouseId, productId, boxes, notes
      const payload = {
        producerId: selectedProducer,
        warehouseId: selectedWarehouse,
        productId: selectedProduct,
        boxes: Number(boxes),
        notes,
      }
      const created = await apiPost("/api/producers/fruit-receptions", payload)
      setReceptions((prev) => [created, ...(prev || [])])
      setSelectedProducer("")
      setSelectedWarehouse("")
      setSelectedProduct("")
      setReceptionDate(new Date().toISOString().split("T")[0])
      setBoxes("")
      setWeightPerBox("")
      setNotes("")
      setIsDialogOpen(false)
    } catch (err) {
      console.error("Error saving reception:", err)
      alert("Error: " + (err as any)?.message || String(err))
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

  // Handler para ver detalles
  const handleViewReception = (reception: any) => {
    setSelectedReception(reception)
    setIsViewDialogOpen(true)
  }

  // Handler para imprimir
  const handlePrintReception = (reception: any) => {
    window.print() // Personaliza si necesitas formato especial
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recepción de Fruta</CardTitle>
            <CardDescription>Registra la entrega de fruta por parte de productores (sin ajuste de cuenta hasta venta)</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Recepción
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nueva Recepción de Fruta</DialogTitle>
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
                        {producers.map((producer) => (
                          <SelectItem key={producer.id} value={producer.id}>
                            {producer.code} - {producer.name}
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
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Recepción *</Label>
                  <Input id="date" type="date" value={receptionDate} onChange={(e) => setReceptionDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Producto (Fruta) *</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {fruitProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.sku} - {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Cajas *</Label>
                    <Input type="number" placeholder="0" value={boxes} onChange={(e) => setBoxes(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Peso por Caja (kg)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={weightPerBox} onChange={(e) => setWeightPerBox(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Peso Total (kg)</Label>
                  <Input value={totalWeight.toFixed(2)} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={!selectedProducer || !selectedWarehouse || !selectedProduct || !boxes}>
                  Guardar Recepción
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
            <Input placeholder="Buscar por número o productor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Productor</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cajas</TableHead>
                <TableHead>Peso Total</TableHead>
                <TableHead>Estado Embarque</TableHead>
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
                    <TableCell className="font-medium">{reception.code || reception.receptionNumber}</TableCell>
                    <TableCell>{producer?.name}</TableCell>
                    <TableCell>{product?.name}</TableCell>
                    <TableCell>{reception.boxes}</TableCell>
                    <TableCell>{reception.totalWeight} kg</TableCell>
                    <TableCell>{getShipmentStatusBadge(reception.shipmentStatus || "pendiente")}</TableCell>
                    <TableCell>{formatDate(reception.receptionDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Recepción de Fruta</DialogTitle>
            <DialogDescription>Información general de la recepción</DialogDescription>
          </DialogHeader>
          {selectedReception && (
            <div className="grid gap-2 py-2">
              <div><b>Código:</b> {selectedReception.code || selectedReception.receptionNumber}</div>
              <div><b>Productor:</b> {producers.find(p => String(p.id) === String(selectedReception.producerId))?.name || '-'}</div>
              <div><b>Producto:</b> {products.find(p => String(p.id) === String(selectedReception.productId))?.name || '-'}</div>
              <div><b>Cajas:</b> {selectedReception.boxes}</div>
              <div><b>Peso total:</b> {selectedReception.totalWeight} kg</div>
              <div><b>Estatus de envío:</b> {selectedReception.shipmentStatus || 'pendiente'}</div>
              <div><b>Fecha:</b> {formatDate(selectedReception.receptionDate)}</div>
              <div><b>Notas:</b> {selectedReception.notes || '-'}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
