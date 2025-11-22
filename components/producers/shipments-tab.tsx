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
import { ComboBox } from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { Plus, Search, Eye, Edit, DollarSign, Package, Trash2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import type { ShipmentStatus } from "@/lib/types"
import {
  useShipments,
  useFruitReceptions,
  useProducers,
  createShipment as apiCreateShipment,
  updateShipment as apiUpdateShipment,
  updateShipmentStatus as apiUpdateShipmentStatus,
  deleteShipment as apiDeleteShipment,
} from "@/lib/hooks/use-producers"
import { mutate as globalMutate } from "swr"
import { products } from "@/lib/mock-data"

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const [selectedReceptions, setSelectedReceptions] = useState<string[]>([])
  const [carrier, setCarrier] = useState("")
  const [carrierContact, setCarrierContact] = useState("")
  const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")

  // For edit dialog (edit general shipment info and receptions)
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null)
  const [editSelectedReceptions, setEditSelectedReceptions] = useState<string[]>([])
  const [editCarrier, setEditCarrier] = useState("")
  const [editCarrierContact, setEditCarrierContact] = useState("")
  const [editShipmentDate, setEditShipmentDate] = useState("")
  const [editNotes, setEditNotes] = useState("")

  // For update dialog (status)
  const [selectedShipment, setSelectedShipment] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<ShipmentStatus>("embarcada")
  const [arrivalDate, setArrivalDate] = useState("")
  const [salePrice, setSalePrice] = useState("")
  const [updateNotes, setUpdateNotes] = useState("")

  // Estado para el modal de detalles
  const [viewShipment, setViewShipment] = useState<any | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const { fruitReceptions } = useFruitReceptions()
  const { shipments, mutate: mutateShipments } = useShipments()
  const { producers } = useProducers()

  const pendingReceptions = (fruitReceptions || []).filter((r) => r.shipmentStatus === "pendiente")

  const filteredShipments = (shipments || []).filter((shipment) => {
    const number = (shipment as any).shipmentNumber || (shipment as any).code || ""
    return number.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const selectedReceptionsData = pendingReceptions.filter((r) => selectedReceptions.includes(r.id))
  const totalBoxes = selectedReceptionsData.reduce((sum, r) => sum + Number(r.boxes || 0), 0)
  const producersInvolved = new Set(selectedReceptionsData.map((r) => r.producerId)).size

  const handleToggleReception = (receptionId: string) => {
    setSelectedReceptions((prev) =>
      prev.includes(receptionId) ? prev.filter((id) => id !== receptionId) : [...prev, receptionId],
    )
  }

  const handleCreateShipment = () => {
    ;(async () => {
      try {
        // Backend DTO accepts: receptionIds, carrier?, driver?, notes?, date?
        const payload: any = {
          receptionIds: selectedReceptions,
          date: shipmentDate,
          carrier,
          notes,
        }
        if (carrierContact) payload.driver = carrierContact
        const created = await apiCreateShipment(payload)
  // Refresh lists
  await mutateShipments()
  // Refresh receptions list
  await globalMutate("fruit-receptions")
        // Reset form
        setSelectedReceptions([])
        setCarrier("")
        setCarrierContact("")
        setShipmentDate(new Date().toISOString().split("T")[0])
        setNotes("")
        setIsCreateDialogOpen(false)
        console.log("Created shipment", created)
      } catch (err) {
        console.error("Failed creating shipment", err)
        alert("Error al crear embarque: " + (err as any)?.message || err)
      }
    })()
  }

  const handleUpdateShipment = () => {
    ;(async () => {
      try {
        if (!selectedShipment) throw new Error("No shipment selected")
        const salePriceNumber = updateStatus === "vendida" && salePrice ? Number(salePrice) : undefined
        const updated = await apiUpdateShipmentStatus(selectedShipment, updateStatus, salePriceNumber)
        await mutateShipments()
        setIsUpdateDialogOpen(false)
        console.log("Updated shipment", updated)
      } catch (err) {
        console.error("Failed updating shipment", err)
        alert("Error al actualizar embarque: " + (err as any)?.message || err)
      }
    })()
  }

  // Handler para ver detalles
  const handleViewShipment = (shipment: any) => {
    // Enriquecer el objeto de shipment con recepciones y datos derivados para asegurar que el modal tenga valores
    const receptionIds: string[] = shipment.receptionIds || []
    const embeddedReceptions: any[] = Array.isArray(shipment.receptions) && shipment.receptions.length > 0
      ? shipment.receptions
      : (fruitReceptions || []).filter((r) => receptionIds.includes(r.id))

    const totalBoxesFromReceptions = embeddedReceptions.reduce((s, r) => s + Number(r.boxes || 0), 0)
    const totalWeightFromReceptions = embeddedReceptions.reduce((s, r) => {
      if (typeof r.totalWeight === 'number') return s + r.totalWeight
      if (typeof r.boxes === 'number' && typeof r.weightPerBox === 'number') return s + r.boxes * r.weightPerBox
      return s
    }, 0)

    const enriched: any = {
      ...shipment,
      receptions: embeddedReceptions,
      totalBoxes: typeof shipment.totalBoxes === 'number' ? shipment.totalBoxes : totalBoxesFromReceptions,
      totalWeight: typeof shipment.totalWeight === 'number' ? shipment.totalWeight : totalWeightFromReceptions,
    }

    setViewShipment(enriched)
    setIsViewDialogOpen(true)
  }

  const handleDeleteShipment = async (shipment: any) => {
    if (shipment.status === "vendida") {
      alert("No se puede eliminar un embarque que ya ha sido vendido")
      return
    }

    if (!confirm(`¿Estás seguro de eliminar el embarque ${shipment.code || shipment.shipmentNumber}? Las recepciones volverán al estado pendiente.`)) {
      return
    }

    try {
      await apiDeleteShipment(shipment.id)
      await mutateShipments()
      await globalMutate("fruit-receptions")
    } catch (err) {
      console.error("Error deleting shipment:", err)
      alert("Error al eliminar: " + (err as any)?.message || String(err))
    }
  }

  const handleEditShipment = (shipment: any) => {
    setEditingShipmentId(shipment.id)
    
    // Obtener IDs de recepciones actuales del embarque
    const currentReceptionIds = shipment.receptionIds || 
      (Array.isArray(shipment.receptions) ? shipment.receptions.map((r: any) => r.id) : [])
    
    setEditSelectedReceptions(currentReceptionIds)
    setEditCarrier(shipment.carrier || "")
    setEditCarrierContact(shipment.carrierContact || "")
    setEditShipmentDate(shipment.date || shipment.shipmentDate || "")
    setEditNotes(shipment.notes || "")
    setIsEditDialogOpen(true)
  }

  const handleToggleEditReception = (receptionId: string) => {
    setEditSelectedReceptions((prev) =>
      prev.includes(receptionId) ? prev.filter((id) => id !== receptionId) : [...prev, receptionId]
    )
  }

  const handleSaveEdit = async () => {
    if (!editingShipmentId) return

    try {
      const payload: any = {
        carrier: editCarrier,
        date: editShipmentDate,
        receptionIds: editSelectedReceptions,
      }
      if (editCarrierContact) payload.driver = editCarrierContact
      if (editNotes) payload.notes = editNotes

      await apiUpdateShipment(editingShipmentId, payload)
      await mutateShipments()
      await globalMutate("fruit-receptions")
      setIsEditDialogOpen(false)
      setEditingShipmentId(null)
    } catch (err) {
      console.error("Error updating shipment:", err)
      alert("Error al actualizar: " + (err as any)?.message || String(err))
    }
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
            <DialogContent 
              className="max-w-[98vw] w-[98vw]! max-h-[98vh] h-[98vh]! overflow-hidden flex flex-col p-0 gap-0"
            >
              <div className="flex flex-col h-full p-6">
                <DialogHeader className="shrink-0 space-y-2 pb-4">
                  <DialogTitle className="text-xl">Crear Nuevo Embarque</DialogTitle>
                  <DialogDescription className="text-sm">
                    Selecciona múltiples recepciones de diferentes productores para agrupar en un embarque
                  </DialogDescription>
                </DialogHeader>
              
              <div className="flex-1 overflow-y-auto px-6 pb-4">
                <div className="grid gap-6 py-4">
                  {selectedReceptions.length > 0 && (
                    <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <Package className="h-6 w-6 text-blue-600 mt-1 shrink-0" />
                        <div className="space-y-2 flex-1">
                          <p className="text-base font-semibold text-blue-900">Resumen de Selección</p>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-blue-600 font-medium text-xs">Recepciones</span>
                              <span className="text-2xl font-bold text-blue-900">{selectedReceptions.length}</span>
                            </div>
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-blue-600 font-medium text-xs">Productores</span>
                              <span className="text-2xl font-bold text-blue-900">{producersInvolved}</span>
                            </div>
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-blue-600 font-medium text-xs">Cajas Totales</span>
                              <span className="text-2xl font-bold text-blue-900">{totalBoxes}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Seleccionar Recepciones Pendientes</Label>
                    <div className="rounded-lg border-2 shadow-sm">
                      <div className="max-h-[350px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted z-10">
                            <TableRow className="hover:bg-muted">
                              <TableHead className="w-16 text-center h-12">
                                <Checkbox
                                  checked={selectedReceptions.length === pendingReceptions.length && pendingReceptions.length > 0}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedReceptions(pendingReceptions.map(r => r.id))
                                    } else {
                                      setSelectedReceptions([])
                                    }
                                  }}
                                />
                              </TableHead>
                              <TableHead className="font-semibold text-sm">Número</TableHead>
                              <TableHead className="font-semibold text-sm">Folio</TableHead>
                              <TableHead className="font-semibold text-sm">Productor</TableHead>
                              <TableHead className="font-semibold text-sm">Producto</TableHead>
                              <TableHead className="font-semibold text-sm text-right">Cajas</TableHead>
                              <TableHead className="font-semibold text-sm text-right">Peso/Caja</TableHead>
                              <TableHead className="font-semibold text-sm text-right">Peso Total</TableHead>
                              <TableHead className="font-semibold text-sm">Fecha</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingReceptions.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground py-12 text-sm">
                                  No hay recepciones pendientes de embarque
                                </TableCell>
                              </TableRow>
                            ) : (
                              pendingReceptions.map((reception) => {
                                const producer = producers?.find((p) => p.id === reception.producerId)
                                const isSelected = selectedReceptions.includes(reception.id)
                                const receptionNumber = (reception as any).receptionNumber || (reception as any).code || ""
                                const receptionDate = (reception as any).receptionDate || (reception as any).date || reception.createdAt
                                return (
                                  <TableRow 
                                    key={reception.id} 
                                    className={`cursor-pointer transition-colors h-12 ${isSelected ? "bg-blue-100 hover:bg-blue-200" : "hover:bg-muted/50"}`}
                                    onClick={() => handleToggleReception(reception.id)}
                                  >
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggleReception(reception.id)}
                                      />
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">{receptionNumber}</TableCell>
                                    <TableCell className="text-sm">
                                      {reception.trackingFolio ? (
                                        <span className="font-mono text-xs bg-blue-50 px-1.5 py-0.5 rounded">{reception.trackingFolio}</span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">{producer?.name || "-"}</TableCell>
                                    <TableCell className="text-sm">{(reception as any).product?.name || "-"}</TableCell>
                                    <TableCell className="text-right font-semibold text-sm">{reception.boxes}</TableCell>
                                    <TableCell className="text-right text-sm">{reception.weightPerBox ? `${reception.weightPerBox} kg` : "-"}</TableCell>
                                    <TableCell className="text-right font-semibold text-sm">{reception.totalWeight ? `${reception.totalWeight} kg` : "-"}</TableCell>
                                    <TableCell className="whitespace-nowrap text-sm">{formatDate(receptionDate)}</TableCell>
                                  </TableRow>
                                )
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="carrier" className="text-sm font-semibold">
                        Transportista <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="carrier"
                        placeholder="Nombre de la empresa transportista"
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="carrierContact" className="text-sm font-semibold">
                        Contacto del Transportista
                      </Label>
                      <Input
                        id="carrierContact"
                        placeholder="Teléfono o email"
                        value={carrierContact}
                        onChange={(e) => setCarrierContact(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shipmentDate" className="text-sm font-semibold">
                      Fecha de Embarque <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="shipmentDate"
                      type="date"
                      value={shipmentDate}
                      onChange={(e) => setShipmentDate(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-semibold">
                      Notas
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Destino, observaciones, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 pt-4 pb-6 px-6 border-t">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="h-10 px-6 text-sm">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateShipment} 
                  disabled={selectedReceptions.length === 0 || !carrier}
                  className="h-10 px-6 text-sm"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Crear Embarque ({selectedReceptions.length} recepciones)
                </Button>
              </DialogFooter>
            </div>
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
                <TableHead>Folio Seguimiento</TableHead>
                <TableHead>Productores</TableHead>
                <TableHead>Cajas Totales</TableHead>
                    <TableHead>Peso Total</TableHead>
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
                const config = statusConfig[(shipment as any).status as ShipmentStatus]
                const receptionIds: string[] = (shipment as any).receptionIds || []
                const receptions = (fruitReceptions || []).filter((r) => receptionIds.includes(r.id))
                const producersList = [...new Set(receptions.map((r) => r.producerId))]
                  .map((id) => producers.find((p) => p.id === id))
                  .filter(Boolean)

                const shipmentNumber = (shipment as any).shipmentNumber || (shipment as any).code || ""
                const shipmentDate = (shipment as any).shipmentDate || (shipment as any).date || (shipment as any).createdAt
                return (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">{shipmentNumber}</TableCell>
                    <TableCell>
                      {(() => {
                        const folios = [...new Set(receptions.map((r) => r.trackingFolio).filter(Boolean))]
                        if (folios.length === 0 && (shipment as any).trackingFolio) {
                          return <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded">{(shipment as any).trackingFolio}</span>
                        }
                        if (folios.length === 0) return <span className="text-muted-foreground text-sm">-</span>
                        if (folios.length === 1) {
                          return <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded">{folios[0]}</span>
                        }
                        return (
                          <div className="text-sm">
                            <span className="font-mono text-xs bg-blue-50 px-1 py-0.5 rounded">{folios[0]}</span>
                            <div className="text-muted-foreground text-xs">+{folios.length - 1} más</div>
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {producersList.length > 0 ? (
                          <>
                            <div>{producersList[0]?.name}</div>
                            {producersList.length > 1 && (
                              <div className="text-muted-foreground text-xs">+{producersList.length - 1} más</div>
                            )}
                          </>
                        ) : (
                          "-"
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{(shipment as any).totalBoxes}</TableCell>
                    <TableCell>
                      {typeof (shipment as any).totalWeight === "number"
                        ? `${(shipment as any).totalWeight.toFixed(2)} kg`
                        : (() => {
                            const computed = receptions.reduce((s, r) => {
                              if (typeof r.totalWeight === "number") return s + r.totalWeight
                              if (typeof r.boxes === "number" && typeof r.weightPerBox === "number") return s + r.boxes * r.weightPerBox
                              return s
                            }, 0)
                            return computed > 0 ? `${computed.toFixed(2)} kg` : "-"
                          })()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{(shipment as any).carrier}</div>
                        {(shipment as any).carrierContact && (
                          <div className="text-muted-foreground text-xs">{(shipment as any).carrierContact}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{shipmentDate ? formatDate(shipmentDate) : "-"}</TableCell>
                    <TableCell>{(shipment as any).arrivalDate ? formatDate((shipment as any).arrivalDate) : "-"}</TableCell>
                    <TableCell>
                      {(shipment as any).salePrice ? (
                        <div>
                          <div className="font-semibold text-green-600">{formatCurrency((shipment as any).salePrice)}/caja</div>
                          <div className="text-sm text-muted-foreground">
                            Total: {formatCurrency((shipment as any).totalSale || 0)}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config?.variant || "default"}>{config?.label || (shipment as any).status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {shipment.status !== "vendida" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Editar embarque"
                              onClick={() => handleEditShipment(shipment)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Actualizar estado"
                              onClick={() => {
                                setSelectedShipment(shipment.id)
                                setUpdateStatus((shipment as any).status)
                                setIsUpdateDialogOpen(true)
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Eliminar embarque"
                              onClick={() => handleDeleteShipment(shipment)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" title="Ver detalles" onClick={() => handleViewShipment(shipment)}>
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

        {/* Edit Shipment Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-[98vw] w-[98vw]! max-h-[98vh] h-[98vh]! overflow-hidden flex flex-col p-0 gap-0">
            <div className="flex flex-col h-full p-6">
              <DialogHeader className="shrink-0 space-y-2 pb-4">
                <DialogTitle className="text-xl">Editar Embarque</DialogTitle>
                <DialogDescription className="text-sm">
                  Modifica la información del embarque y las recepciones incluidas
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-4">
                <div className="grid gap-6 py-4">
                  {editSelectedReceptions.length > 0 && (
                    <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <Package className="h-6 w-6 text-blue-600 mt-1 shrink-0" />
                        <div className="space-y-2 flex-1">
                          <p className="text-base font-semibold text-blue-900">Resumen de Selección</p>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-blue-600 font-medium text-xs">Recepciones</span>
                              <span className="text-2xl font-bold text-blue-900">{editSelectedReceptions.length}</span>
                            </div>
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-blue-600 font-medium text-xs">Productores</span>
                              <span className="text-2xl font-bold text-blue-900">
                                {(() => {
                                  const allReceptions = [
                                    ...(fruitReceptions || []).filter((r) => r.shipmentStatus === "pendiente"),
                                    ...(fruitReceptions || []).filter((r) => editSelectedReceptions.includes(r.id))
                                  ]
                                  const selected = allReceptions.filter((r) => editSelectedReceptions.includes(r.id))
                                  return new Set(selected.map((r) => r.producerId)).size
                                })()}
                              </span>
                            </div>
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-blue-600 font-medium text-xs">Cajas Totales</span>
                              <span className="text-2xl font-bold text-blue-900">
                                {(() => {
                                  const allReceptions = [
                                    ...(fruitReceptions || []).filter((r) => r.shipmentStatus === "pendiente"),
                                    ...(fruitReceptions || []).filter((r) => editSelectedReceptions.includes(r.id))
                                  ]
                                  const selected = allReceptions.filter((r) => editSelectedReceptions.includes(r.id))
                                  return selected.reduce((sum, r) => sum + Number(r.boxes || 0), 0)
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Seleccionar Recepciones</Label>
                    <p className="text-sm text-muted-foreground">
                      Puedes agregar recepciones pendientes o mantener/quitar las actuales del embarque
                    </p>
                    <div className="rounded-lg border-2 shadow-sm">
                      <div className="max-h-[300px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted z-10">
                            <TableRow className="hover:bg-muted">
                              <TableHead className="w-16 text-center h-12">
                                <Checkbox
                                  checked={(() => {
                                    const available = [
                                      ...(fruitReceptions || []).filter((r) => r.shipmentStatus === "pendiente"),
                                      ...(fruitReceptions || []).filter((r) => editSelectedReceptions.includes(r.id))
                                    ]
                                    return editSelectedReceptions.length === available.length && available.length > 0
                                  })()}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      const available = [
                                        ...(fruitReceptions || []).filter((r) => r.shipmentStatus === "pendiente"),
                                        ...(fruitReceptions || []).filter((r) => editSelectedReceptions.includes(r.id))
                                      ]
                                      setEditSelectedReceptions(available.map(r => r.id))
                                    } else {
                                      setEditSelectedReceptions([])
                                    }
                                  }}
                                />
                              </TableHead>
                              <TableHead className="font-semibold text-sm">Número</TableHead>
                              <TableHead className="font-semibold text-sm">Folio</TableHead>
                              <TableHead className="font-semibold text-sm">Productor</TableHead>
                              <TableHead className="font-semibold text-sm">Producto</TableHead>
                              <TableHead className="font-semibold text-sm text-right">Cajas</TableHead>
                              <TableHead className="font-semibold text-sm text-right">Peso Total</TableHead>
                              <TableHead className="font-semibold text-sm">Estado</TableHead>
                              <TableHead className="font-semibold text-sm">Fecha</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              // Mostrar recepciones pendientes + las que están en el embarque actual
                              const availableReceptions = [
                                ...(fruitReceptions || []).filter((r) => r.shipmentStatus === "pendiente"),
                                ...(fruitReceptions || []).filter((r) => editSelectedReceptions.includes(r.id))
                              ]
                              // Eliminar duplicados
                              const uniqueReceptions = Array.from(new Map(availableReceptions.map(r => [r.id, r])).values())
                              
                              if (uniqueReceptions.length === 0) {
                                return (
                                  <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12 text-sm">
                                      No hay recepciones disponibles
                                    </TableCell>
                                  </TableRow>
                                )
                              }
                              
                              return uniqueReceptions.map((reception) => {
                                const producer = producers?.find((p) => p.id === reception.producerId)
                                const isSelected = editSelectedReceptions.includes(reception.id)
                                const receptionNumber = (reception as any).receptionNumber || (reception as any).code || ""
                                const receptionDate = (reception as any).receptionDate || (reception as any).date || reception.createdAt
                                const isInCurrentShipment = editSelectedReceptions.includes(reception.id) && reception.shipmentStatus !== "pendiente"
                                
                                return (
                                  <TableRow 
                                    key={reception.id} 
                                    className={`cursor-pointer transition-colors h-12 ${isSelected ? "bg-blue-100 hover:bg-blue-200" : "hover:bg-muted/50"}`}
                                    onClick={() => handleToggleEditReception(reception.id)}
                                  >
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggleEditReception(reception.id)}
                                      />
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">{receptionNumber}</TableCell>
                                    <TableCell className="text-sm">
                                      {reception.trackingFolio ? (
                                        <span className="font-mono text-xs bg-blue-50 px-1.5 py-0.5 rounded">{reception.trackingFolio}</span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">{producer?.name || "-"}</TableCell>
                                    <TableCell className="text-sm">{(reception as any).product?.name || "-"}</TableCell>
                                    <TableCell className="text-right font-semibold text-sm">{reception.boxes}</TableCell>
                                    <TableCell className="text-right font-semibold text-sm">
                                      {reception.totalWeight ? `${reception.totalWeight} kg` : "-"}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {isInCurrentShipment ? (
                                        <Badge variant="secondary" className="text-xs">En este embarque</Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs">Pendiente</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-sm">{formatDate(receptionDate)}</TableCell>
                                  </TableRow>
                                )
                              })
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="editCarrier" className="text-sm font-semibold">
                        Transportista <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="editCarrier"
                        placeholder="Nombre de la empresa transportista"
                        value={editCarrier}
                        onChange={(e) => setEditCarrier(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editCarrierContact" className="text-sm font-semibold">
                        Contacto del Transportista
                      </Label>
                      <Input
                        id="editCarrierContact"
                        placeholder="Teléfono o email"
                        value={editCarrierContact}
                        onChange={(e) => setEditCarrierContact(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editShipmentDate" className="text-sm font-semibold">
                      Fecha de Embarque <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="editShipmentDate"
                      type="date"
                      value={editShipmentDate}
                      onChange={(e) => setEditShipmentDate(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editNotes" className="text-sm font-semibold">
                      Notas
                    </Label>
                    <Textarea
                      id="editNotes"
                      placeholder="Destino, observaciones, etc."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 pt-4 pb-6 px-6 border-t">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="h-10 px-6 text-sm">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveEdit} 
                  disabled={editSelectedReceptions.length === 0 || !editCarrier || !editShipmentDate}
                  className="h-10 px-6 text-sm"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Guardar Cambios ({editSelectedReceptions.length} recepciones)
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Update Shipment Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
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
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={salePrice}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setSalePrice(value)
                        }
                      }}
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
                            const shipment = (shipments || []).find((s) => s.id === selectedShipment)
                            if (!shipment) return null
                            const receptions = (fruitReceptions || []).filter((r) => (shipment as any).receptionIds?.includes(r.id))
                            return (
                              <div className="space-y-1 text-xs">
                                {receptions.map((r) => {
                                  const producer = producers?.find((p) => p.id === r.producerId)
                                  const amount = r.boxes * Number(salePrice)
                                  return (
                                    <div key={r.id} className="flex justify-between">
                                      <span>{producer?.name || r.producerId}:</span>
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

        {/* View Shipment Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Detalles del Embarque</DialogTitle>
              <DialogDescription>Información completa del embarque y sus recepciones</DialogDescription>
            </DialogHeader>
            {viewShipment && (() => {
              // Prefer shipments.receptions when available (server may embed them), otherwise fall back to global fruitReceptions
              const shipmentReceptions: any[] =
                Array.isArray(viewShipment.receptions) && viewShipment.receptions.length > 0
                  ? viewShipment.receptions
                  : (fruitReceptions || []).filter((r) => (viewShipment.receptionIds || []).includes(r.id))

              // Boxes: prefer shipment.totalBoxes, then sum receptions
              const boxesComputed =
                typeof viewShipment.totalBoxes === "number"
                  ? viewShipment.totalBoxes
                  : shipmentReceptions.reduce((s, r) => s + Number(r.boxes || 0), 0)

              // Weight: prefer server-provided shipment.totalWeight, otherwise sum reception.totalWeight or boxes * weightPerBox
              const totalWeightComputed = shipmentReceptions.reduce((s, r) => {
                if (typeof r.totalWeight === "number") return s + r.totalWeight
                if (typeof r.boxes === "number" && typeof r.weightPerBox === "number") return s + r.boxes * r.weightPerBox
                return s
              }, 0)

              const serverWeight = typeof viewShipment.totalWeight === "number" && !Number.isNaN(viewShipment.totalWeight)
                ? Number(viewShipment.totalWeight)
                : undefined
              const weightToShow = serverWeight !== undefined ? serverWeight : totalWeightComputed
              const weightPerBox = boxesComputed > 0 && weightToShow > 0 ? (weightToShow / boxesComputed).toFixed(2) : "0.00"

              const estado = viewShipment.status ? String(viewShipment.status).toLowerCase() : "-"
              const config = statusConfig[estado as ShipmentStatus] || { label: estado, variant: "default" as const }
              const fecha = viewShipment.shipmentDate ? formatDate(viewShipment.shipmentDate) : formatDate(viewShipment.createdAt || new Date())
              const notas = viewShipment.notes || "Sin notas"

              // Get unique producers involved
              const producersInvolved = [...new Set(shipmentReceptions.map((r) => r.producerId))]
                .map((id) => producers?.find((p) => p.id === id))
                .filter(Boolean)

              return (
                <div className="space-y-6 py-2">
                  {/* Main Info Card */}
                  <Card className="border-2 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Información General</CardTitle>
                          <CardDescription>Datos principales del embarque</CardDescription>
                        </div>
                        <Badge variant={config.variant} className="text-sm px-3 py-1">
                          {config.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Número de Embarque</p>
                          <p className="font-semibold text-base">{viewShipment.code || viewShipment.shipmentNumber || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Fecha de Embarque</p>
                          <p className="font-semibold text-base">{fecha}</p>
                        </div>
                      </div>
                      
                      {viewShipment.arrivalDate && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Fecha de Llegada</p>
                          <p className="font-semibold text-base">{formatDate(viewShipment.arrivalDate)}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Transportista</p>
                          <p className="font-semibold text-base">{viewShipment.carrier || "-"}</p>
                        </div>
                        {viewShipment.carrierContact && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Contacto</p>
                            <p className="font-semibold text-base">{viewShipment.carrierContact}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Metrics Card with gradient */}
                  <Card className="border-2 shadow-sm bg-linear-to-br from-blue-50 to-indigo-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        Métricas del Embarque
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-muted-foreground mb-2">Total de Cajas</p>
                          <p className="text-3xl font-bold text-blue-600">{boxesComputed}</p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-muted-foreground mb-2">Peso Total</p>
                          <p className="text-3xl font-bold text-blue-600">{weightToShow ? weightToShow.toFixed(2) : "0"}</p>
                          <p className="text-xs text-muted-foreground mt-1">kg</p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-muted-foreground mb-2">Peso por Caja</p>
                          <p className="text-3xl font-bold text-blue-600">{weightPerBox}</p>
                          <p className="text-xs text-muted-foreground mt-1">kg/caja</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sale Info Card (if sold) */}
                  {viewShipment.status === "vendida" && viewShipment.salePrice && (
                    <Card className="border-2 border-green-200 shadow-sm bg-linear-to-br from-green-50 to-emerald-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          Información de Venta
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                            <p className="text-sm text-muted-foreground mb-2">Precio por Caja</p>
                            <p className="text-3xl font-bold text-green-600">{formatCurrency(viewShipment.salePrice)}</p>
                          </div>
                          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                            <p className="text-sm text-muted-foreground mb-2">Venta Total</p>
                            <p className="text-3xl font-bold text-green-600">
                              {formatCurrency((viewShipment.totalSale || (viewShipment.salePrice * boxesComputed)))}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Producers Involved */}
                  {producersInvolved.length > 0 && (
                    <Card className="border-2 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Productores Involucrados</CardTitle>
                        <CardDescription>{producersInvolved.length} productor(es) en este embarque</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {producersInvolved.map((producer) => {
                            const producerReceptions = shipmentReceptions.filter((r) => r.producerId === producer?.id)
                            const producerBoxes = producerReceptions.reduce((s, r) => s + Number(r.boxes || 0), 0)
                            return (
                              <div key={producer?.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                  <p className="font-semibold">{producer?.name}</p>
                                  <p className="text-sm text-muted-foreground">{producer?.code}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-blue-600">{producerBoxes} cajas</p>
                                  <p className="text-xs text-muted-foreground">{producerReceptions.length} recepción(es)</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Receptions Table */}
                  {shipmentReceptions.length > 0 && (
                    <Card className="border-2 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Recepciones Incluidas</CardTitle>
                        <CardDescription>{shipmentReceptions.length} recepción(es) en este embarque</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Número</TableHead>
                                <TableHead>Folio</TableHead>
                                <TableHead>Productor</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Cajas</TableHead>
                                <TableHead className="text-right">Peso Total</TableHead>
                                <TableHead>Fecha</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {shipmentReceptions.map((reception) => {
                                const producer = producers?.find((p) => p.id === reception.producerId)
                                const receptionNumber = reception.receptionNumber || reception.code || "-"
                                const receptionDate = reception.receptionDate || reception.date || reception.createdAt
                                const productName = reception.product?.name || reception.productName || "-"
                                return (
                                  <TableRow key={reception.id}>
                                    <TableCell className="font-medium">{receptionNumber}</TableCell>
                                    <TableCell>
                                      {reception.trackingFolio ? (
                                        <span className="font-mono text-xs bg-blue-50 px-2 py-1 rounded">
                                          {reception.trackingFolio}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell>{producer?.name || "-"}</TableCell>
                                    <TableCell>{productName}</TableCell>
                                    <TableCell className="text-right font-semibold">{reception.boxes}</TableCell>
                                    <TableCell className="text-right font-semibold">
                                      {reception.totalWeight ? `${reception.totalWeight} kg` : "-"}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{formatDate(receptionDate)}</TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Notes Section */}
                  {notas && notas !== "Sin notas" && (
                    <Card className="border-2 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Notas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">{notas}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Audit Info */}
                  <Card className="border-2 shadow-sm bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Creado</p>
                          <p className="font-medium">{formatDate(viewShipment.createdAt || new Date())}</p>
                        </div>
                        {viewShipment.updatedAt && (
                          <div>
                            <p className="text-muted-foreground mb-1">Actualizado</p>
                            <p className="font-medium">{formatDate(viewShipment.updatedAt)}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
