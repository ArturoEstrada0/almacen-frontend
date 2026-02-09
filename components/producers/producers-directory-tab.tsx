"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Label } from "@/components/ui/label"
import { Plus, Search, Edit, Eye, DollarSign, Printer, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { apiGet, apiPost, apiPatch } from "@/lib/db/localApi"
import { PrintFormatDialog, PrintFormat, openPrintWindow, getPrintStyles } from "@/components/ui/print-format-dialog"
import { formatCurrency } from "@/lib/utils/format"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ProtectedCreate, ProtectedUpdate } from "@/components/auth/protected-action"
import { TablePagination, usePagination } from "@/components/ui/table-pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ProducersDirectoryTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [sortBy, setSortBy] = useState<"name" | "code" | "city">("name")
  const [producers, setProducers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const data = await apiGet("/api/producers")
        if (mounted) setProducers(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Error loading producers:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  // Form state for creating producer
  const [formCode, setFormCode] = useState("")
  const [formName, setFormName] = useState("")
  const [formRfc, setFormRfc] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formCity, setFormCity] = useState("")
  const [formState, setFormState] = useState("")
  const [formContactName, setFormContactName] = useState("")

  const handleCreateProducer = async () => {
    try {
      setSaving(true)
      const payload = {
        code: formCode || `PROD-${Date.now()}`,
        name: formName,
        taxId: formRfc,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        city: formCity,
        state: formState,
        contactName: formContactName,
      }
      const created = await apiPost("/api/producers", payload)
      setProducers((prev) => [created, ...prev])
      setIsDialogOpen(false)
      // reset form
      setFormCode("")
      setFormName("")
      setFormRfc("")
      setFormPhone("")
      setFormEmail("")
      setFormAddress("")
      setFormCity("")
      setFormState("")
      setFormContactName("")
    } catch (err) {
      console.error("Error creating producer:", err)
      alert("Error creando productor: " + (err as any)?.message || String(err))
    } finally {
      setSaving(false)
    }
  }

  const sortedProducers = [...producers].sort((a, b) => {
    switch (sortBy) {
      case 'code': {
        const av = (a.code || "").toString().toLowerCase()
        const bv = (b.code || "").toString().toLowerCase()
        return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      case 'city': {
        const av = (a.city || "").toString().toLowerCase()
        const bv = (b.city || "").toString().toLowerCase()
        return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      case 'name':
      default: {
        const aName = (a.name || "").toLowerCase()
        const bName = (b.name || "").toLowerCase()
        return sortOrder === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName)
      }
    }
  })

  const filteredProducers = sortedProducers.filter(
    (producer) =>
      (producer.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (producer.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (producer.city || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Pagination
  const { pagedItems: pagedProducers, paginationProps } = usePagination(filteredProducers, 20)

  // Estado y handler para ver detalles de productor
  const [selectedProducer, setSelectedProducer] = useState<any | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  // Estado para el modal de detalles
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  // Estado para impresión por productor
  const [isProducerPrintDialogOpen, setIsProducerPrintDialogOpen] = useState(false)
  const [producerToPrint, setProducerToPrint] = useState<any | null>(null)

  const handlePrintProducer = (producer: any) => {
    setProducerToPrint(producer)
    setIsProducerPrintDialogOpen(true)
  }

  const doPrintProducer = (producer: any, format: PrintFormat) => {
    if (!producer) return
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Información Productor - ${producer.name}</title>
  <style>${getPrintStyles(format)}</style>
</head>
<body>
  <div class="container">
    <h1>Información del Productor</h1>
    <div class="divider"></div>
    
    <div class="row">
      <span class="label">Código:</span>
      <span class="value">${producer.code || '-'}</span>
    </div>
    <div class="row">
      <span class="label">Nombre:</span>
      <span class="value">${producer.name || '-'}</span>
    </div>
    <div class="row">
      <span class="label">RFC:</span>
      <span class="value">${producer.rfc || producer.taxId || '-'}</span>
    </div>
    <div class="row">
      <span class="label">Teléfono:</span>
      <span class="value">${producer.phone || '-'}</span>
    </div>
    <div class="row">
      <span class="label">Email:</span>
      <span class="value">${producer.email || '-'}</span>
    </div>
    <div class="row">
      <span class="label">Dirección:</span>
      <span class="value">${producer.address || '-'}</span>
    </div>
    <div class="row">
      <span class="label">Ciudad:</span>
      <span class="value">${producer.city || '-'}</span>
    </div>
    <div class="row">
      <span class="label">Estado:</span>
      <span class="value">${producer.state || '-'}</span>
    </div>
    <div class="row">
      <span class="label">Contacto:</span>
      <span class="value">${producer.contactName || '-'}</span>
    </div>
    <div class="row total-row">
      <span class="label">Saldo en Cuenta:</span>
      <span class="value">${formatCurrency(producer.accountBalance || 0)}</span>
    </div>
    <div class="row">
      <span class="label">Estatus:</span>
      <span class="value">${producer.isActive ? 'Activo' : 'Inactivo'}</span>
    </div>
    
    <div class="footer">
      <p>Generado desde Padre-Almacén</p>
      <p>${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>`

    openPrintWindow(html, format)
  }

  // Handler para ver detalles
  const handleViewProducer = (producer: any) => {
    setSelectedProducer(producer)
    setIsViewDialogOpen(true)
  }

  // Handler para editar productor
  const handleEditProducer = (producer: any) => {
    setSelectedProducer(producer)
    setIsEditDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Directorio de Productores</CardTitle>
            <CardDescription>Gestiona la información de tus productores</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nombre (A–Z)</SelectItem>
                <SelectItem value="code">Código</SelectItem>
                <SelectItem value="city">Ciudad</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')} title="Ordenar A–Z / Z–A">
              <ChevronsUpDown className="mr-2 h-4 w-4" />
              {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <ProtectedCreate module="producers">
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Productor
                  </Button>
                </DialogTrigger>
              </ProtectedCreate>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuevo Productor</DialogTitle>
                  <DialogDescription>Registra un nuevo productor en el sistema</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Código</Label>
                      <Input id="code" placeholder="PROD-004" value={formCode} onChange={(e) => setFormCode(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre Completo</Label>
                      <Input id="name" placeholder="Nombre del productor" value={formName} onChange={(e) => setFormName(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rfc">RFC</Label>
                      <Input id="rfc" placeholder="ABCD123456XYZ" value={formRfc} onChange={(e) => setFormRfc(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input id="phone" placeholder="+52 123 456 7890" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="productor@email.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input id="address" placeholder="Rancho, Parcela, etc." value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Ciudad</Label>
                      <Input id="city" placeholder="Ciudad" value={formCity} onChange={(e) => setFormCity(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input id="state" placeholder="Estado" value={formState} onChange={(e) => setFormState(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Nombre de Contacto</Label>
                    <Input id="contact" placeholder="Persona de contacto" value={formContactName} onChange={(e) => setFormContactName(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateProducer} disabled={saving || !formName}>
                    {saving ? "Guardando..." : "Guardar Productor"}
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
            <Input
              placeholder="Buscar por nombre, código o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TablePagination {...paginationProps} />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedProducers.map((producer) => (
                <TableRow key={producer.id}>
                  <TableCell className="font-medium">{producer.code}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{producer.name}</div>
                      {producer.rfc && <div className="text-sm text-muted-foreground">{producer.rfc}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{producer.city}</div>
                      <div className="text-muted-foreground">{producer.state}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{producer.phone}</div>
                      {producer.email && <div className="text-muted-foreground">{producer.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span
                        className={
                          producer.accountBalance > 0
                            ? "font-semibold text-green-600"
                            : producer.accountBalance < 0
                              ? "font-semibold text-red-600"
                              : "text-muted-foreground"
                        }
                      >
                        {formatCurrency(Math.abs(producer.accountBalance))}
                      </span>
                      {Number(producer.accountBalance) > 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          A favor
                        </Badge>
                      )}
                      {Number(producer.accountBalance) < 0 && (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          En contra
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={producer.isActive ? "default" : "secondary"}>
                      {producer.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleViewProducer(producer)}>
                              <Eye className="h-4 w-4 mr-1" />
                              <span className="hidden md:inline">Ver</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalles del productor</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button variant="ghost" size="sm" onClick={() => handlePrintProducer(producer)} title="Imprimir">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <ProtectedUpdate module="producers">
                        <Button variant="ghost" size="sm" onClick={() => handleEditProducer(producer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </ProtectedUpdate>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination {...paginationProps} />
      </CardContent>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Productor</DialogTitle>
            <DialogDescription>Modifica la información del productor</DialogDescription>
          </DialogHeader>
          {selectedProducer && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Código</Label>
                  <Input id="edit-code" value={selectedProducer.code} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nombre Completo</Label>
                  <Input id="edit-name" value={selectedProducer.name} onChange={e => setSelectedProducer({ ...selectedProducer, name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-rfc">RFC</Label>
                  <Input id="edit-rfc" value={selectedProducer.rfc || ''} onChange={e => setSelectedProducer({ ...selectedProducer, rfc: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Teléfono</Label>
                  <Input id="edit-phone" value={selectedProducer.phone || ''} onChange={e => setSelectedProducer({ ...selectedProducer, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" value={selectedProducer.email || ''} onChange={e => setSelectedProducer({ ...selectedProducer, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Dirección</Label>
                <Input id="edit-address" value={selectedProducer.address || ''} onChange={e => setSelectedProducer({ ...selectedProducer, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-city">Ciudad</Label>
                  <Input id="edit-city" value={selectedProducer.city || ''} onChange={e => setSelectedProducer({ ...selectedProducer, city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-state">Estado</Label>
                  <Input id="edit-state" value={selectedProducer.state || ''} onChange={e => setSelectedProducer({ ...selectedProducer, state: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact">Nombre de Contacto</Label>
                <Input id="edit-contact" value={selectedProducer.contactName || ''} onChange={e => setSelectedProducer({ ...selectedProducer, contactName: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={async () => {
              try {
                // Filtrar solo los campos permitidos por el DTO
                const {
                  name,
                  code,
                  email,
                  phone,
                  address,
                  rfc,
                  taxId,
                  city,
                  state,
                  contactName,
                } = selectedProducer
                // taxId puede venir como rfc
                const payload: any = {
                  name,
                  code,
                  email,
                  phone,
                  address,
                  city,
                  state,
                  contactName,
                }
                if (rfc) payload.taxId = rfc
                if (taxId) payload.taxId = taxId
                await apiPatch(`/api/producers/${selectedProducer.id}`, payload)
                setIsEditDialogOpen(false)
                const data = await apiGet("/api/producers")
                setProducers(Array.isArray(data) ? data : [])
              } catch (err) {
                alert("Error actualizando productor: " + (err as any)?.message || String(err))
              }
            }}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Productor</DialogTitle>
            <DialogDescription>Información general del productor</DialogDescription>
          </DialogHeader>
          {selectedProducer && (
            <div className="grid gap-2 py-2">
              <div><b>Código:</b> {selectedProducer.code}</div>
              <div><b>Nombre:</b> {selectedProducer.name}</div>
              <div><b>RFC:</b> {selectedProducer.rfc || selectedProducer.taxId || '-'}</div>
              <div><b>Teléfono:</b> {selectedProducer.phone || '-'}</div>
              <div><b>Email:</b> {selectedProducer.email || '-'}</div>
              <div><b>Dirección:</b> {selectedProducer.address || '-'}</div>
              <div><b>Ciudad:</b> {selectedProducer.city || '-'}</div>
              <div><b>Estado:</b> {selectedProducer.state || '-'}</div>
              <div><b>Contacto:</b> {selectedProducer.contactName || '-'}</div>
              <div><b>Saldo:</b> {formatCurrency(selectedProducer.accountBalance || 0)}</div>
              <div><b>Estatus:</b> {selectedProducer.isActive ? 'Activo' : 'Inactivo'}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Cerrar
            </Button>
            <Button variant="default" onClick={() => { setProducerToPrint(selectedProducer); setIsProducerPrintDialogOpen(true); }}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para elegir formato de impresión del productor */}
      <PrintFormatDialog
        open={isProducerPrintDialogOpen}
        onOpenChange={setIsProducerPrintDialogOpen}
        onPrint={(format) => doPrintProducer(producerToPrint, format)}
        title="Imprimir productor"
        description="Elige el formato para imprimir la información del productor"
      />
    </Card>
  )
}
