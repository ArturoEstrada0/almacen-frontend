"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Plus, Search, Eye, Edit, DollarSign, Package } from "lucide-react"
import { mockShipments, mockFruitReceptions, mockProducers, mockProducts } from "@/lib/mock-data"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import type { ShipmentStatus } from "@/lib/types"

const statusConfig: Record<
  ShipmentStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  embarcada: { label: "Embarcada", variant: "secondary" },
  "en-transito": { label: "En Tránsito", variant: "default" },
  recibida: { label: "Recibida", variant: "outline" },
  vendida: { label: "Vendida", variant: "default" },
}

export function ShipmentsTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)

  const [selectedReceptions, setSelectedReceptions] = useState<string[]>([])
  const [carrier, setCarrier] = useState("")
  const [carrierContact, setCarrierContact] = useState("")
  const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")

  // For update dialog
  const [selectedShipment, setSelectedShipment] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<ShipmentStatus>("embarcada")
  const [arrivalDate, setArrivalDate] = useState("")
  const [salePrice, setSalePrice] = useState("")
  const [updateNotes, setUpdateNotes] = useState("")

  const pendingReceptions = mockFruitReceptions.filter((r) => r.shipmentStatus === "pendiente")

  const filteredShipments = mockShipments.filter((shipment) =>
    shipment.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const selectedReceptionsData = pendingReceptions.filter((r) => selectedReceptions.includes(r.id))
  const totalBoxes = selectedReceptionsData.reduce((sum, r) => sum + r.boxes, 0)
  const producersInvolved = new Set(selectedReceptionsData.map((r) => r.producerId)).size

  const handleToggleReception = (receptionId: string) => {
    setSelectedReceptions((prev) =>
      prev.includes(receptionId) ? prev.filter((id) => id !== receptionId) : [...prev, receptionId],
    )
  }

  const handleCreateShipment = () => {
    console.log("[v0] Creating shipment with multiple receptions:", {
      receptionIds: selectedReceptions,
      totalBoxes,
      producersInvolved,
      carrier,
      carrierContact,
      shipmentDate,
      status: "embarcada",
      notes,
    })
    // Reset form
    setSelectedReceptions([])
    setCarrier("")
    setCarrierContact("")
    setShipmentDate(new Date().toISOString().split("T")[0])
    setNotes("")
    setIsCreateDialogOpen(false)
  }

  const handleUpdateShipment = () => {
    if (updateStatus === "vendida" && salePrice) {
      const shipment = mockShipments.find((s) => s.id === selectedShipment)
      if (shipment) {
        const receptions = mockFruitReceptions.filter((r) => shipment.receptionIds?.includes(r.id))
        const producerAmounts = receptions.map((r) => ({
          producerId: r.producerId,
          producerName: mockProducers.find((p) => p.id === r.producerId)?.name,
          boxes: r.boxes,
          amount: r.boxes * Number(salePrice),
        }))

        console.log("[v0] Updating shipment to sold - generating account movements:", {
          shipmentId: selectedShipment,
          status: updateStatus,
          salePrice: Number(salePrice),
          totalAmount: totalBoxes * Number(salePrice),
          producerAmounts,
          arrivalDate,
          notes: updateNotes,
        })
      }
    } else {
      console.log("[v0] Updating shipment status:", {
        shipmentId: selectedShipment,
        status: updateStatus,
        arrivalDate: arrivalDate || undefined,
        notes: updateNotes,
      })
    }
    setIsUpdateDialogOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Embarques</CardTitle>
            <CardDescription>Agrupa recepciones de múltiples productores y gestiona ventas</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear Embarque
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Embarque</DialogTitle>
                <DialogDescription>
                  Selecciona múltiples recepciones de diferentes productores para agrupar en un embarque
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {selectedReceptions.length > 0 && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-start gap-2">
                      <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-900">Resumen de Selección</p>
                        <div className="text-sm text-blue-700 space-y-1">
                          <p>
                            <strong>{selectedReceptions.length}</strong> recepciones seleccionadas
                          </p>
                          <p>
                            <strong>{producersInvolved}</strong> productores involucrados
                          </p>
                          <p>
                            <strong>{totalBoxes}</strong> cajas totales
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Seleccionar Recepciones Pendientes</Label>
                  <div className="rounded-md border max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Número</TableHead>
                          <TableHead>Productor</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cajas</TableHead>
                          <TableHead>Peso/Caja</TableHead>
                          <TableHead>Peso Total</TableHead>
                          <TableHead>Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingReceptions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                              No hay recepciones pendientes de embarque
                            </TableCell>
                          </TableRow>
                        ) : (
                          pendingReceptions.map((reception) => {
                            const producer = mockProducers.find((p) => p.id === reception.producerId)
                            const product = mockProducts.find((p) => p.id === reception.productId)
                            const isSelected = selectedReceptions.includes(reception.id)
                            return (
                              <TableRow key={reception.id} className={isSelected ? "bg-blue-50" : ""}>
                                <TableCell>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleToggleReception(reception.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{reception.receptionNumber}</TableCell>
                                <TableCell>{producer?.name}</TableCell>
                                <TableCell>{product?.name}</TableCell>
                                <TableCell>{reception.boxes}</TableCell>
                                <TableCell>{reception.weightPerBox} kg</TableCell>
                                <TableCell>{reception.totalWeight} kg</TableCell>
                                <TableCell>{formatDate(reception.receptionDate)}</TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="carrier">Transportista *</Label>
                  <Input
                    id="carrier"
                    placeholder="Nombre de la empresa transportista"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="carrierContact">Contacto del Transportista</Label>
                  <Input
                    id="carrierContact"
                    placeholder="Teléfono o email"
                    value={carrierContact}
                    onChange={(e) => setCarrierContact(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipmentDate">Fecha de Embarque *</Label>
                  <Input
                    id="shipmentDate"
                    type="date"
                    value={shipmentDate}
                    onChange={(e) => setShipmentDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    placeholder="Destino, observaciones, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateShipment} disabled={selectedReceptions.length === 0 || !carrier}>
                  Crear Embarque
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
              placeholder="Buscar por número..."
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
                <TableHead>Productores</TableHead>
                <TableHead>Cajas Totales</TableHead>
                <TableHead>Transportista</TableHead>
                <TableHead>Embarque</TableHead>
                <TableHead>Llegada</TableHead>
                <TableHead>Precio Venta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.map((shipment) => {
                const config = statusConfig[shipment.status]
                const receptions = mockFruitReceptions.filter((r) => shipment.receptionIds?.includes(r.id))
                const producers = [...new Set(receptions.map((r) => r.producerId))]
                  .map((id) => mockProducers.find((p) => p.id === id))
                  .filter(Boolean)

                return (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">{shipment.shipmentNumber}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {producers.length > 0 ? (
                          <>
                            <div>{producers[0]?.name}</div>
                            {producers.length > 1 && (
                              <div className="text-muted-foreground text-xs">+{producers.length - 1} más</div>
                            )}
                          </>
                        ) : (
                          "-"
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{shipment.totalBoxes}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{shipment.carrier}</div>
                        {shipment.carrierContact && (
                          <div className="text-muted-foreground text-xs">{shipment.carrierContact}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{shipment.shipmentDate ? formatDate(shipment.shipmentDate) : "-"}</TableCell>
                    <TableCell>{shipment.arrivalDate ? formatDate(shipment.arrivalDate) : "-"}</TableCell>
                    <TableCell>
                      {shipment.salePrice ? (
                        <div>
                          <div className="font-semibold text-green-600">{formatCurrency(shipment.salePrice)}/caja</div>
                          <div className="text-sm text-muted-foreground">
                            Total: {formatCurrency(shipment.saleTotalAmount || 0)}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Actualizar estado"
                          onClick={() => {
                            setSelectedShipment(shipment.id)
                            setUpdateStatus(shipment.status)
                            setIsUpdateDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
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

        {/* Update Shipment Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Actualizar Embarque</DialogTitle>
              <DialogDescription>Actualiza el estado y precio de venta del embarque</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="status">Estado *</Label>
                <Select value={updateStatus} onValueChange={(value) => setUpdateStatus(value as ShipmentStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="embarcada">Embarcada</SelectItem>
                    <SelectItem value="en-transito">En Tránsito</SelectItem>
                    <SelectItem value="recibida">Recibida</SelectItem>
                    <SelectItem value="vendida">Vendida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(updateStatus === "recibida" || updateStatus === "vendida") && (
                <div className="space-y-2">
                  <Label htmlFor="arrivalDate">Fecha de Llegada</Label>
                  <Input
                    id="arrivalDate"
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                  />
                </div>
              )}

              {updateStatus === "vendida" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="salePrice">Precio de Venta por Caja *</Label>
                    <Input
                      id="salePrice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                    />
                  </div>

                  {salePrice && selectedShipment && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-start gap-2">
                        <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="space-y-2 flex-1">
                          <p className="text-sm font-medium text-green-900">Ajuste de Estados de Cuenta</p>
                          <p className="text-sm text-green-700">
                            Se generarán movimientos A FAVOR de cada productor según sus cajas:
                          </p>
                          {(() => {
                            const shipment = mockShipments.find((s) => s.id === selectedShipment)
                            if (!shipment) return null
                            const receptions = mockFruitReceptions.filter((r) => shipment.receptionIds?.includes(r.id))
                            return (
                              <div className="space-y-1 text-xs">
                                {receptions.map((r) => {
                                  const producer = mockProducers.find((p) => p.id === r.producerId)
                                  const amount = r.boxes * Number(salePrice)
                                  return (
                                    <div key={r.id} className="flex justify-between">
                                      <span>{producer?.name}:</span>
                                      <span className="font-semibold">
                                        {r.boxes} cajas × {formatCurrency(Number(salePrice))} = {formatCurrency(amount)}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="updateNotes">Notas</Label>
                <Textarea
                  id="updateNotes"
                  placeholder="Observaciones sobre la actualización..."
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateShipment} disabled={updateStatus === "vendida" && !salePrice}>
                Actualizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
