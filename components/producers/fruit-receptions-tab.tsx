"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Search, Eye, Printer, Package } from "lucide-react"
import { mockFruitReceptions, mockProducers, mockWarehouses, mockProducts } from "@/lib/mock-data"
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

  const fruitProducts = mockProducts.filter((p) => p.type === "fruta")

  const filteredReceptions = mockFruitReceptions.filter(
    (reception) =>
      reception.receptionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mockProducers
        .find((p) => p.id === reception.producerId)
        ?.name.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  )

  const totalWeight = boxes && weightPerBox ? Number(boxes) * Number(weightPerBox) : 0

  const handleSave = () => {
    console.log("[v0] Saving fruit reception:", {
      producerId: selectedProducer,
      warehouseId: selectedWarehouse,
      productId: selectedProduct,
      receptionDate,
      boxes: Number(boxes),
      weightPerBox: Number(weightPerBox),
      totalWeight,
      shipmentStatus: "pendiente", // Initial status is pending
      notes,
    })
    // Reset form
    setSelectedProducer("")
    setSelectedWarehouse("")
    setSelectedProduct("")
    setReceptionDate(new Date().toISOString().split("T")[0])
    setBoxes("")
    setWeightPerBox("")
    setNotes("")
    setIsDialogOpen(false)
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recepción de Fruta</CardTitle>
            <CardDescription>
              Registra la entrega de fruta por parte de productores (sin ajuste de cuenta hasta venta)
            </CardDescription>
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
                <DialogDescription>Registra la entrada de fruta entregada por un productor</DialogDescription>
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
                  <Label htmlFor="date">Fecha de Recepción *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={receptionDate}
                    onChange={(e) => setReceptionDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product">Producto (Fruta) *</Label>
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
                    <Label htmlFor="boxes">Número de Cajas *</Label>
                    <Input
                      id="boxes"
                      type="number"
                      placeholder="0"
                      value={boxes}
                      onChange={(e) => setBoxes(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso por Caja (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={weightPerBox}
                      onChange={(e) => setWeightPerBox(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalWeight">Peso Total (kg)</Label>
                  <Input id="totalWeight" value={totalWeight.toFixed(2)} disabled className="bg-muted" />
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-2">
                    <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900">Flujo de Recepción</p>
                      <p className="text-sm text-blue-700">
                        La recepción se registra con estado "Pendiente Embarque". No se ajusta el estado de cuenta hasta
                        que se venda el embarque con precio final.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    placeholder="Calidad, observaciones, etc."
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
                  disabled={!selectedProducer || !selectedWarehouse || !selectedProduct || !boxes}
                >
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
                const producer = mockProducers.find((p) => p.id === reception.producerId)
                const product = mockProducts.find((p) => p.id === reception.productId)
                return (
                  <TableRow key={reception.id}>
                    <TableCell className="font-medium">{reception.receptionNumber}</TableCell>
                    <TableCell>{producer?.name}</TableCell>
                    <TableCell>{product?.name}</TableCell>
                    <TableCell>{reception.boxes}</TableCell>
                    <TableCell>{reception.totalWeight} kg</TableCell>
                    <TableCell>{getShipmentStatusBadge(reception.shipmentStatus || "pendiente")}</TableCell>
                    <TableCell>{formatDate(reception.receptionDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" title="Imprimir recibo">
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
