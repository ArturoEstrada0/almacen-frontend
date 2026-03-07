"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { Search, Building2, Edit, Trash2, Mail, Phone, Send, Eye } from "lucide-react"
import { updateSupplier } from "@/lib/hooks/use-suppliers"
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

export function SuppliersDirectoryTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")

  const { suppliers: apiSuppliers, isLoading, isError, mutate } = useSuppliers()

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)
  const [isSaving, setIsSaving] = useState(false)
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
    contactName: s.contactName || "",
    phone: s.phone || "",
    email: s.email || "",
    creditDays: s.paymentTerms || 0,
    isActive: s.active ?? true,
    city: s.city || "",
    state: s.state || "",
  }))

  const filteredSuppliers = mappedSuppliers.filter((supplier) => {
    return (
      supplier.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.rfc.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleDeleteClick = (supplierId: string) => {
    setDeleteTarget(supplierId)
    setDeleteDialogOpen(true)
  }

  const handleEditClick = (supplier: any) => {
    // Map supplier shape to the edit form shape used in new supplier page
    setEditingSupplier({
      id: supplier.id,
      code: supplier.code || "",
      name: supplier.businessName || "",
      taxId: supplier.rfc || "",
      businessType: supplier.businessType || "",
      contactName: supplier.contactName || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: "",
      creditDays: supplier.creditDays ?? "",
      isActive: !!supplier.isActive,
      bankNameMxn: "",
      accountNumberMxn: "",
      clabeMxn: "",
      bankNameUsd: "",
      accountNumberUsd: "",
      swiftCodeUsd: "",
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingSupplier) return
    setIsSaving(true)
    try {
      const payload = {
        code: editingSupplier.code,
        name: editingSupplier.name,
        taxId: editingSupplier.taxId || undefined,
        email: editingSupplier.email || undefined,
        phone: editingSupplier.phone || undefined,
        address: editingSupplier.address || undefined,
        contactName: editingSupplier.contactName || undefined,
        businessType: editingSupplier.businessType || undefined,
        creditDays: editingSupplier.creditDays ? Number(editingSupplier.creditDays) : undefined,
        isActive: !!editingSupplier.isActive,
        bankNameMxn: editingSupplier.bankNameMxn || undefined,
        accountNumberMxn: editingSupplier.accountNumberMxn || undefined,
        clabeMxn: editingSupplier.clabeMxn || undefined,
        bankNameUsd: editingSupplier.bankNameUsd || undefined,
        accountNumberUsd: editingSupplier.accountNumberUsd || undefined,
        swiftCodeUsd: editingSupplier.swiftCodeUsd || undefined,
      }

      await updateSupplier(editingSupplier.id, payload)
      mutate()
      setEditDialogOpen(false)
      setEditingSupplier(null)
      toast({ title: "Proveedor actualizado", description: "Los datos del proveedor se guardaron correctamente." })
    } catch (error) {
      console.error("Error actualizando proveedor:", error)
      toast({ title: "Error", description: "No se pudo actualizar el proveedor. Revisa la consola para más detalles." })
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      // Soft-delete: marcar como inactivo para evitar violaciones de FK
      await updateSupplier(deleteTarget, { isActive: false })
      mutate()
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      toast({ title: "Proveedor eliminado", description: "El proveedor fue desactivado correctamente." })
    } catch (error) {
      console.error("Error eliminando proveedor:", error)
      toast({ title: "Error", description: "No se pudo eliminar el proveedor. Revisa la consola para más detalles.", action: { label: 'Ver consola' } })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, código o RFC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>¿Seguro que deseas eliminar este proveedor? Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit supplier dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Proveedor</DialogTitle>
            <DialogDescription>Modifica los datos del proveedor y guarda los cambios.</DialogDescription>
          </DialogHeader>
          {editingSupplier && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Código</Label>
                  <Input id="code" value={editingSupplier.code} onChange={(e) => setEditingSupplier({ ...editingSupplier, code: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="name">Razón Social</Label>
                  <Input id="name" value={editingSupplier.name} onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="taxId">RFC / Tax ID</Label>
                  <Input id="taxId" value={editingSupplier.taxId} onChange={(e) => setEditingSupplier({ ...editingSupplier, taxId: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="businessType">Giro</Label>
                  <Input id="businessType" value={editingSupplier.businessType} onChange={(e) => setEditingSupplier({ ...editingSupplier, businessType: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="contactName">Contacto</Label>
                  <Input id="contactName" value={editingSupplier.contactName} onChange={(e) => setEditingSupplier({ ...editingSupplier, contactName: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="creditDays">Días de Crédito</Label>
                  <Input id="creditDays" type="number" value={String(editingSupplier.creditDays ?? "")} onChange={(e) => setEditingSupplier({ ...editingSupplier, creditDays: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={editingSupplier.email} onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" value={editingSupplier.phone} onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" value={editingSupplier.address} onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })} />
                </div>

                <div className="md:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cuenta Bancaria - Pesos (MXN)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label htmlFor="bankNameMxn">Banco</Label>
                        <Input id="bankNameMxn" value={editingSupplier.bankNameMxn} onChange={(e) => setEditingSupplier({ ...editingSupplier, bankNameMxn: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="accountNumberMxn">Número de Cuenta</Label>
                        <Input id="accountNumberMxn" value={editingSupplier.accountNumberMxn} onChange={(e) => setEditingSupplier({ ...editingSupplier, accountNumberMxn: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="clabeMxn">CLABE</Label>
                        <Input id="clabeMxn" value={editingSupplier.clabeMxn} onChange={(e) => setEditingSupplier({ ...editingSupplier, clabeMxn: e.target.value })} />
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
                        <Label htmlFor="bankNameUsd">Banco</Label>
                        <Input id="bankNameUsd" value={editingSupplier.bankNameUsd} onChange={(e) => setEditingSupplier({ ...editingSupplier, bankNameUsd: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="accountNumberUsd">Número de Cuenta</Label>
                        <Input id="accountNumberUsd" value={editingSupplier.accountNumberUsd} onChange={(e) => setEditingSupplier({ ...editingSupplier, accountNumberUsd: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="swiftCodeUsd">Código SWIFT</Label>
                        <Input id="swiftCodeUsd" value={editingSupplier.swiftCodeUsd} onChange={(e) => setEditingSupplier({ ...editingSupplier, swiftCodeUsd: e.target.value })} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex items-center gap-2">
                  <Switch id="isActive" checked={editingSupplier.isActive} onCheckedChange={(checked) => setEditingSupplier({ ...editingSupplier, isActive: checked })} />
                  <Label className="mb-0">Activo</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setEditDialogOpen(false); setEditingSupplier(null) }} disabled={isSaving}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar cambios"}</Button>
              </div>
            </div>
          )}
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
                  <TableCell colSpan={8} className="text-center text-sm text-destructive">Error al cargar proveedores</TableCell>
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
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(supplier)}>
                          <Edit className="h-4 w-4" />
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
