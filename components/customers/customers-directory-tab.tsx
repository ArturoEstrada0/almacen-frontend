"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCustomers, Customer } from "@/lib/hooks/use-customers"
import { Search, Building2, Edit, Trash2, Mail, Phone, Plus, Eye, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import Spinner2 from "@/components/ui/spinner2"
import { CustomerForm, CustomerFormData } from "./customer-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProtectedDelete } from "@/components/auth/protected-action"

const PAYMENT_METHOD_LABELS = {
  cash: "Efectivo",
  bank_transfer: "Transferencia Bancaria",
  check: "Cheque",
  credit: "Crédito",
}

export function CustomersDirectoryTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { customers, isLoading, isError, error, fetchCustomers, searchCustomers, createCustomer, updateCustomer, deleteCustomer } = useCustomers()
  const { toast } = useToast()

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers()
  }, [])

  // Update filtered customers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers)
    } else {
      const filtered = customers.filter((customer) => {
        const searchLower = searchTerm.toLowerCase()
        return (
          customer.name.toLowerCase().includes(searchLower) ||
          customer.rfc.toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower) ||
          (customer.contactName && customer.contactName.toLowerCase().includes(searchLower))
        )
      })
      setFilteredCustomers(filtered)
    }
  }, [searchTerm, customers])

  const handleCreateCustomer = async (data: CustomerFormData) => {
    setIsSubmitting(true)
    try {
      await createCustomer(data)
      setCreateDialogOpen(false)
      await fetchCustomers()
      toast({
        title: "Éxito",
        description: "Cliente creado exitosamente",
      })
    } catch (err: any) {
      console.error("Error creating customer:", err)
      toast({
        title: "Error",
        description: err.message || "Error al crear cliente",
        variant: "destructive",
      })
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateCustomer = async (data: CustomerFormData) => {
    if (!selectedCustomer) return

    setIsSubmitting(true)
    try {
      await updateCustomer(selectedCustomer.id, data)
      setEditDialogOpen(false)
      setSelectedCustomer(null)
      await fetchCustomers()
      toast({
        title: "Éxito",
        description: "Cliente actualizado exitosamente",
      })
    } catch (err: any) {
      console.error("Error updating customer:", err)
      toast({
        title: "Error",
        description: err.message || "Error al actualizar cliente",
        variant: "destructive",
      })
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (customerId: string) => {
    setDeleteTarget(customerId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      await deleteCustomer(deleteTarget)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      await fetchCustomers()
      toast({
        title: "Éxito",
        description: "Cliente eliminado exitosamente",
      })
    } catch (err: any) {
      console.error("Error deleting customer:", err)
      toast({
        title: "Error",
        description: err.message || "Error al eliminar cliente",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditClick = (customer: Customer) => {
    setSelectedCustomer(customer)
    setEditDialogOpen(true)
  }

  const handleDetailsClick = (customer: Customer) => {
    setSelectedCustomer(customer)
    setDetailsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner2 />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Catálogo de Clientes</h2>
          <p className="text-gray-600 text-sm">Gestiona y consulta la información de los clientes</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cliente</DialogTitle>
              <DialogDescription>Completa el formulario para crear un nuevo cliente</DialogDescription>
            </DialogHeader>
            <CustomerForm onSubmit={handleCreateCustomer} isLoading={isSubmitting} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, RFC, email o contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Error al cargar clientes"}</AlertDescription>
        </Alert>
      )}

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes ({filteredCustomers.length})</CardTitle>
          <CardDescription>Lista completa de clientes registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay clientes registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFC</TableHead>
                    <TableHead>Nombre / Razón Social</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Forma de Pago</TableHead>
                    <TableHead>Crédito</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-mono text-sm">{customer.rfc}</TableCell>
                      <TableCell className="font-semibold">{customer.name}</TableCell>
                      <TableCell>{customer.contactName || "-"}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{customer.phone}</span>
                      </TableCell>
                      <TableCell>
                        <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline text-sm">
                          {customer.email}
                        </a>
                      </TableCell>
                      <TableCell>{PAYMENT_METHOD_LABELS[customer.paymentMethod]}</TableCell>
                      <TableCell>
                        {customer.creditDays > 0 ? (
                          <Badge variant="outline">{customer.creditDays} días</Badge>
                        ) : (
                          <Badge variant="secondary">Contado</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.active ? "default" : "secondary"}>
                          {customer.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDetailsClick(customer)}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(customer)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <ProtectedDelete module="users">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(customer.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </ProtectedDelete>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>Actualiza la información del cliente</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <CustomerForm
              initialData={selectedCustomer}
              onSubmit={handleUpdateCustomer}
              isLoading={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Detalles del Cliente</DialogTitle>
              <DialogDescription>{selectedCustomer?.name}</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              {/* Identification */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Identificación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-500">RFC</p>
                      <p className="font-mono break-all">{selectedCustomer.rfc}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Razón Social</p>
                      <p className="font-semibold wrap-break-word">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tipo de Negocio</p>
                      <p>{selectedCustomer.businessType || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Estado</p>
                      <p>
                        <Badge variant={selectedCustomer.active ? "default" : "secondary"}>
                          {selectedCustomer.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Dirección</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm wrap-break-word">{selectedCustomer.street} {selectedCustomer.streetNumber}</p>
                  {selectedCustomer.neighborhood && <p className="text-sm wrap-break-word">{selectedCustomer.neighborhood}</p>}
                  <p className="text-sm">
                    {selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.postalCode}
                  </p>
                </CardContent>
              </Card>

              {/* Contact */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="break-all">{selectedCustomer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                    <a href={`mailto:${selectedCustomer.email}`} className="text-blue-600 hover:underline break-all">
                      {selectedCustomer.email}
                    </a>
                  </div>
                  {selectedCustomer.contactName && (
                    <p className="text-sm">
                      <span className="text-gray-500">Contacto:</span> {selectedCustomer.contactName}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Payment */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Información de Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-500">Forma de Pago</p>
                      <p className="wrap-break-word">{PAYMENT_METHOD_LABELS[selectedCustomer.paymentMethod]}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Días de Crédito</p>
                      <p>{selectedCustomer.creditDays > 0 ? `${selectedCustomer.creditDays} días` : "Al contado"}</p>
                    </div>
                    {selectedCustomer.bankName && (
                      <div>
                        <p className="text-xs text-gray-500">Banco</p>
                        <p>{selectedCustomer.bankName}</p>
                      </div>
                    )}
                    {selectedCustomer.clabe && (
                      <div>
                        <p className="text-xs text-gray-500">CLABE</p>
                        <p className="font-mono text-sm break-all">{selectedCustomer.clabe}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {selectedCustomer.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Notas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm wrap-break-word">{selectedCustomer.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
