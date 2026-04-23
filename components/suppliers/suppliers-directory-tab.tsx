"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { Search, Building2, Edit, Trash2, Mail, Phone, Send, Eye } from "lucide-react"
import { updateSupplier, deleteSupplier } from "@/lib/hooks/use-suppliers"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProtectedUpdate, ProtectedDelete } from "@/components/auth/protected-action"
import Spinner2 from "@/components/ui/spinner2"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SUPPLIER_TYPE_OPTIONS, getSupplierTypeLabel } from "@/lib/constants/supplier-types"
import Link from "next/link"

export function SuppliersDirectoryTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSupplierType, setSelectedSupplierType] = useState("all")
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")

  const { suppliers: apiSuppliers, isLoading, isError, mutate } = useSuppliers(
    selectedSupplierType === "all" ? undefined : selectedSupplierType,
  )

  const { toast } = useToast()
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [detailsSupplier, setDetailsSupplier] = useState<any | null>(null)

  // Map backend supplier shape to the UI shape previously provided by mockSuppliers
  const mappedSuppliers = apiSuppliers.map((s: any) => ({
    id: s.id,
    code: s.code || "",
    businessName: s.name || "",
    rfc: s.rfc || s.taxId || "",
    businessType: s.businessType || "",
    supplierType: s.supplierType || "",
    contactName: s.contactName || "",
    phone: s.phone || "",
    email: s.email || "",
    creditDays: s.paymentTerms || 0,
    isActive: s.active ?? true,
    city: s.city || "",
    state: s.state || "",
  }))

  const filteredSuppliers = mappedSuppliers.filter((supplier) => {
    const matchesType = selectedSupplierType === "all" || supplier.supplierType === selectedSupplierType
    if (!matchesType) return false

    return (
      supplier.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.rfc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getSupplierTypeLabel(supplier.supplierType).toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const handleSendEmail = (supplierId: string) => {
    setSelectedSupplier(supplierId)
    const supplier = mappedSuppliers.find((s) => s.id === supplierId)
    setEmailSubject(`Solicitud de Cotización - ${new Date().toLocaleDateString()}`)
    setEmailBody(
      `Estimado/a ${supplier?.contactName || supplier?.businessName},\n\nNos ponemos en contacto para solicitar una cotización de los siguientes productos:\n\n[Agregar detalles de productos]\n\nQuedamos atentos a su respuesta.\n\nSaludos cordiales.`,
    )
  }

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletionBlockedReason, setDeletionBlockedReason] = useState<string | null>(null)

  const handleDeleteClick = async (supplierId: string) => {
    // Check if supplier has related purchase orders before asking for confirmation
    try {
      const url = API_ENDPOINTS.purchaseOrders.list() + `?supplierId=${supplierId}`
      const orders: any[] = await ApiClient.get<any[]>(url)

      if (Array.isArray(orders) && orders.length > 0) {
        setDeletionBlockedReason(`No se puede eliminar el proveedor porque tiene ${orders.length} orden${orders.length > 1 ? "es" : ""} de compra asignada${orders.length > 1 ? "s" : ""}.`)
        setDeleteTarget(null)
        setDeleteDialogOpen(true)
        return
      }
    } catch (error: any) {
      console.error("Error verificando órdenes de compra del proveedor:", error)
      // If the check fails, fall back to showing the confirmation dialog so user can attempt deletion.
    }

    setDeletionBlockedReason(null)
    setDeleteTarget(supplierId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      // Intentar eliminar en backend
      await deleteSupplier(deleteTarget)
      mutate()
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      toast({ title: "Proveedor eliminado", description: "El proveedor fue eliminado correctamente." })
    } catch (error) {
      console.error("Error eliminando proveedor:", error)
      // If backend responds with a clear message, show it (e.g., FK violation because of assigned purchases)
      const errMsg = (error as any)?.message || "No se pudo eliminar el proveedor. Revisa la consola para más detalles."
      toast({ title: "No se puede eliminar", description: errMsg })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, código, RFC o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div>
              <Select value={selectedSupplierType} onValueChange={setSelectedSupplierType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {SUPPLIER_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeletionBlockedReason(null) }; setDeleteDialogOpen(open) }}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>{deletionBlockedReason ? "No se puede eliminar" : "Confirmar eliminación"}</DialogTitle>
            <DialogDescription>
              {deletionBlockedReason
                ? deletionBlockedReason
                : "¿Seguro que deseas eliminar este proveedor? Esta acción no se puede deshacer."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeletionBlockedReason(null) }} disabled={isDeleting}>
              Cerrar
            </Button>
            {!deletionBlockedReason && (
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Details dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Proveedor</DialogTitle>
            <DialogDescription>Información completa del proveedor (solo lectura)</DialogDescription>
          </DialogHeader>
          {detailsSupplier && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase">Código</p>
                  <p className="text-sm text-foreground mt-1">{detailsSupplier.code}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase">Razón Social</p>
                  <p className="text-sm text-foreground mt-1">{detailsSupplier.name || detailsSupplier.businessName}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase">RFC / Tax ID</p>
                  <p className="text-sm text-foreground mt-1">{detailsSupplier.taxId || detailsSupplier.rfc}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase">Tipo de proveedor</p>
                  <p className="text-sm text-foreground mt-1">{getSupplierTypeLabel(detailsSupplier.supplierType)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase">Giro</p>
                  <p className="text-sm text-foreground mt-1">{detailsSupplier.businessType}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase">Contacto</p>
                  <p className="text-sm text-foreground mt-1">{detailsSupplier.contactName}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase">Crédito (días)</p>
                  <p className="text-sm text-foreground mt-1">{detailsSupplier.creditDays}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase">Teléfono</p>
                  <p className="text-sm text-foreground mt-1">{detailsSupplier.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase">Correo</p>
                  <p className="text-sm text-foreground mt-1">{detailsSupplier.email}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase">Dirección</p>
                  <p className="text-sm text-foreground mt-1">{detailsSupplier.address}</p>
                </div>
                <div className="md:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cuenta Bancaria - Pesos (MXN)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase">Banco</p>
                        <p className="text-sm text-foreground mt-1">{detailsSupplier.bankNameMxn}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase">Número de Cuenta</p>
                        <p className="text-sm text-foreground mt-1">{detailsSupplier.accountNumberMxn}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase">CLABE</p>
                        <p className="text-sm text-foreground mt-1">{detailsSupplier.clabeMxn}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="md:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cuenta Bancaria - Dólares (USD)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase">Banco</p>
                        <p className="text-sm text-foreground mt-1">{detailsSupplier.bankNameUsd}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase">Número de Cuenta</p>
                        <p className="text-sm text-foreground mt-1">{detailsSupplier.accountNumberUsd}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase">Código SWIFT</p>
                        <p className="text-sm text-foreground mt-1">{detailsSupplier.swiftCodeUsd}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase">Estado</p>
                  <Badge variant={detailsSupplier.isActive ? "default" : "secondary"} className="ml-2">{detailsSupplier.isActive ? "Activo" : "Inactivo"}</Badge>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => { setDetailsDialogOpen(false); setDetailsSupplier(null) }}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suppliers Table */}
      <Card>
          <CardHeader>
          <CardTitle>Directorio de Proveedores</CardTitle>
          <CardDescription>
            {isLoading ? "Cargando proveedores..." : `${filteredSuppliers.length} proveedor${filteredSuppliers.length !== 1 ? "es" : ""} encontrado${filteredSuppliers.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner2 />
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Razón Social</TableHead>
                <TableHead>RFC</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Giro</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Crédito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isError ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-destructive">Error al cargar proveedores</TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-mono text-sm">{supplier.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{supplier.businessName}</p>
                        <p className="text-xs text-muted-foreground">
                          {supplier.city}, {supplier.state}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{supplier.rfc}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getSupplierTypeLabel(supplier.supplierType)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{supplier.businessType}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {supplier.contactName && <p className="text-sm font-medium">{supplier.contactName}</p>}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {supplier.phone}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {supplier.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{supplier.creditDays} días</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.isActive ? "default" : "secondary"}>
                      {supplier.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        {/*<DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendEmail(supplier.id)}
                            title="Enviar correo"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>*/}
                        
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Enviar Correo a {supplier.businessName}</DialogTitle>
                            <DialogDescription>Para: {supplier.email}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="subject">Asunto</Label>
                              <Input
                                id="subject"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                placeholder="Asunto del correo"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="body">Mensaje</Label>
                              <Textarea
                                id="body"
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                placeholder="Escribe tu mensaje aquí..."
                                rows={10}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline">Cancelar</Button>
                              <Button>
                                <Send className="mr-2 h-4 w-4" />
                                Enviar Correo
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* View details button */}
                      <Button variant="ghost" size="icon" onClick={() => { setDetailsSupplier(supplier); setDetailsDialogOpen(true) }} title="Ver detalles">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <ProtectedUpdate module="suppliers">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/suppliers/${supplier.id}/edit`} title="Editar proveedor">
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </ProtectedUpdate>
                      <ProtectedDelete module="suppliers">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(supplier.id)} title="Eliminar proveedor">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ProtectedDelete>
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
