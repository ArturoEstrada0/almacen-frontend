"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  useCustomers,
  Customer,
  CustomerAccountStatement,
  CustomerReceivable,
  CreateCustomerReceivableInput,
  RegisterCustomerReceivablePaymentInput,
} from "@/lib/hooks/use-customers"
import { Search, Building2, Edit, Trash2, Mail, Phone, Plus, Eye, AlertCircle, CalendarClock, Wallet } from "lucide-react"
import {
  Dialog,
  DialogClose,
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
import { Label } from "@/components/ui/label"
import { formatLocalDateOnly, getLocalDateInputValue, parseDateOnly } from "@/lib/date-utils"

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
  const [accountStatement, setAccountStatement] = useState<CustomerAccountStatement | null>(null)
  const [isLoadingStatement, setIsLoadingStatement] = useState(false)
  const [isReceivableDialogOpen, setIsReceivableDialogOpen] = useState(false)
  const [isSubmittingReceivable, setIsSubmittingReceivable] = useState(false)
  const [receivableForm, setReceivableForm] = useState<CreateCustomerReceivableInput>({
    invoiceNumber: "",
    saleDate: "",
    invoiceDate: "",
    creditDays: 0,
    originalAmount: 0,
    notes: "",
  })
  const router = useRouter()

  const {
    customers,
    isLoading,
    isError,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    fetchCustomerAccountStatement,
    createCustomerReceivable,
  } = useCustomers()
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
          (customer.customerCode || "").toLowerCase().includes(searchLower) ||
          (customer.rfc || "").toLowerCase().includes(searchLower) ||
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
      const newCustomer = await createCustomer(data)
      setCreateDialogOpen(false)
      // Update filtered list immediately for reactivity
      if (newCustomer) {
        setFilteredCustomers((prev) => [newCustomer, ...prev])
      }
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
      // DEBUG: mostrar payload enviado al backend
      console.debug("Updating customer payload:", data)
      const updated = await updateCustomer(selectedCustomer.id, data)
      setEditDialogOpen(false)
      setSelectedCustomer(null)
      // Update filtered list immediately for reactivity
      if (updated) {
        setFilteredCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      }
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
    loadCustomerStatement(customer.id)
  }

  const loadCustomerStatement = async (customerId: string) => {
    setIsLoadingStatement(true)
    try {
      const statement = await fetchCustomerAccountStatement(customerId)
      setAccountStatement(statement)
    } finally {
      setIsLoadingStatement(false)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0)

  const formatDate = (value?: string) => formatLocalDateOnly(value)

  const computeDueDateIso = (invoiceDate?: string, creditDays?: number) => {
    if (!invoiceDate) return null
    const d = parseDateOnly(invoiceDate)
    if (!d) return null
    const days = Number(creditDays || 0)
    d.setDate(d.getDate() + days)
    return getLocalDateInputValue(d)
  }

  const getReceivableStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendiente: "Pendiente",
      parcial: "Parcial",
      pagada: "Pagada",
      vencida: "Vencida",
    }
    return labels[status] || status
  }

  const getReceivableStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "pagada") return "default"
    if (status === "vencida") return "destructive"
    if (status === "parcial") return "secondary"
    return "outline"
  }

  const getCustomerTypeLabel = (customerType?: string) => {
    if (customerType === "nacional") return "Nacional"
    if (customerType === "extranjero") return "Extranjero"
    return customerType || "-"
  }

  const openReceivableDialog = () => {
    const today = getLocalDateInputValue()
    setReceivableForm({
      invoiceNumber: "",
      saleDate: today,
      invoiceDate: today,
      creditDays: selectedCustomer?.creditDays ?? 0,
      originalAmount: 0,
      notes: "",
    })
    setIsReceivableDialogOpen(true)
  }

  const openPaymentDialog = (receivable: CustomerReceivable) => {
    if (!selectedCustomer) return
    setDetailsDialogOpen(false)
    router.push(`/accounts/${selectedCustomer.id}?receivableId=${receivable.id}`)
  }

  const handleCreateReceivable = async () => {
    if (!selectedCustomer) return

    setIsSubmittingReceivable(true)
    try {
      await createCustomerReceivable(selectedCustomer.id, {
        ...receivableForm,
        creditDays: Number(receivableForm.creditDays || 0),
        originalAmount: Number(receivableForm.originalAmount || 0),
      })

      setIsReceivableDialogOpen(false)
      await loadCustomerStatement(selectedCustomer.id)
      toast({
        title: "Éxito",
        description: "Cuenta por cobrar registrada correctamente",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo registrar la cuenta por cobrar",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingReceivable(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner2 />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Clientes</h1>
          <p className="text-muted-foreground">Gestiona y consulta la información de los clientes</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 bg-black text-white hover:bg-black/90">
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, ID, RFC, email o contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
            <DialogDescription>Agrega un nuevo cliente al catálogo</DialogDescription>
          </DialogHeader>
          <CustomerForm onSubmit={handleCreateCustomer} isLoading={isSubmitting} />
        </DialogContent>
      </Dialog>

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
                    <TableHead>ID Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>RFC</TableHead>
                    <TableHead>Nombre / Razón Social</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-mono text-sm">{customer.customerCode || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={customer.customerType === "extranjero" ? "secondary" : "outline"}>
                          {getCustomerTypeLabel(customer.customerType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{customer.rfc || "-"}</TableCell>
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
      <Dialog
        open={detailsDialogOpen}
        onOpenChange={(open) => {
          setDetailsDialogOpen(open)
          if (!open) {
            setAccountStatement(null)
          }
        }}
      >
        <DialogContent className="w-[90vw] max-w-3xl max-h-[90vh] p-4 overflow-hidden" showCloseButton={false}>
          <div className="sticky top-0 z-20 border-b bg-background px-4 py-4 sm:px-6">
            <div className="absolute top-3 right-3">
              <DialogClose asChild>
                <button aria-label="Cerrar" className="cursor-pointer rounded-md p-1 hover:bg-accent/10">
                  <span className="sr-only">Cerrar</span>
                  ✕
                </button>
              </DialogClose>
            </div>
            <DialogHeader>
              <DialogTitle>Detalles del Cliente</DialogTitle>
              <DialogDescription>{selectedCustomer?.name}</DialogDescription>
            </DialogHeader>
          </div>
          {selectedCustomer && (
            <div className="max-h-[calc(90vh-86px)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            <div className="space-y-4">
              {/* Identification */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Identificación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-500">ID de Cliente</p>
                      <p className="font-mono break-all">{selectedCustomer.customerCode || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tipo de Cliente</p>
                      <p>{getCustomerTypeLabel(selectedCustomer.customerType)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">RFC</p>
                      <p className="font-mono break-all">{selectedCustomer.rfc || "-"}</p>
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
                  {selectedCustomer.customerType === "extranjero" ? (
                    <>
                      <p className="text-sm">{selectedCustomer.city}</p>
                      <p className="text-sm">{selectedCustomer.country || "-"}</p>
                      <p className="text-sm text-gray-600">{selectedCustomer.fullAddress || "-"}</p>
                    </>
                  ) : (
                    <p className="text-sm">
                      {selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.postalCode}
                    </p>
                  )}
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

              {/* Accounts Receivable */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Cuentas por Cobrar</CardTitle>
                    <Button size="sm" className="gap-2" onClick={openReceivableDialog}>
                      <Plus className="h-4 w-4" />
                      Registrar venta
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoadingStatement ? (
                    <div className="flex justify-center py-4">
                      <Spinner2 />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Monto Original</p>
                            <p className="text-sm font-semibold">{formatCurrency(accountStatement?.totals.originalAmount || 0)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Abonos</p>
                            <p className="text-sm font-semibold">{formatCurrency(accountStatement?.totals.paidAmount || 0)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                            <p className="text-sm font-semibold">{formatCurrency(accountStatement?.totals.balanceAmount || 0)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Vencidas</p>
                            <p className="text-sm font-semibold">{accountStatement?.totals.overdueCount || 0}</p>
                          </CardContent>
                        </Card>
                      </div>

                      {(accountStatement?.receivables || []).length === 0 ? (
                        <div className="text-sm text-muted-foreground">No hay cuentas por cobrar registradas.</div>
                      ) : (
                        <div className="border rounded-md overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Factura</TableHead>
                                <TableHead>Emisión</TableHead>
                                <TableHead>Vencimiento</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Saldo</TableHead>
                                <TableHead>Estatus</TableHead>
                                <TableHead>Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(accountStatement?.receivables || []).map((receivable) => (
                                <TableRow key={receivable.id}>
                                  <TableCell className="font-medium break-all">{receivable.invoiceNumber}</TableCell>
                                  <TableCell>{formatDate(receivable.invoiceDate)}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <CalendarClock className="h-3 w-3 text-muted-foreground" />
                                      <span>{formatDate(receivable.dueDate)}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{formatCurrency(receivable.originalAmount)}</TableCell>
                                  <TableCell>{formatCurrency(receivable.balanceAmount)}</TableCell>
                                  <TableCell>
                                    <Badge variant={getReceivableStatusVariant(receivable.status)}>
                                      {getReceivableStatusLabel(receivable.status)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1"
                                      onClick={() => openPaymentDialog(receivable)}
                                      disabled={Number(receivable.balanceAmount || 0) <= 0}
                                    >
                                      <Wallet className="h-3 w-3" />
                                      Abonar
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </>
                  )}
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Receivable Dialog */}
      <Dialog open={isReceivableDialogOpen} onOpenChange={setIsReceivableDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Registrar Cuenta por Cobrar</DialogTitle>
            <DialogDescription>Captura la información de la venta con factura.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="invoiceNumber">Factura</Label>
              <Input
                id="invoiceNumber"
                value={receivableForm.invoiceNumber}
                onChange={(e) => setReceivableForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                placeholder="F-000123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="saleDate">Fecha de venta</Label>
              <Input
                id="saleDate"
                type="date"
                value={receivableForm.saleDate}
                onChange={(e) => setReceivableForm((prev) => ({ ...prev, saleDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Fecha de emisión</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={receivableForm.invoiceDate}
                onChange={(e) => setReceivableForm((prev) => ({ ...prev, invoiceDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditDays">Días de crédito</Label>
              <Input
                id="creditDays"
                type="number"
                min={0}
                value={receivableForm.creditDays ?? 0}
                onChange={(e) => setReceivableForm((prev) => ({ ...prev, creditDays: Number(e.target.value || 0) }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Fecha de vencimiento</Label>
              <Input id="dueDate" value={formatLocalDateOnly(computeDueDateIso(receivableForm.invoiceDate, receivableForm.creditDays) || undefined)} readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="originalAmount">Monto original</Label>
              <Input
                id="originalAmount"
                type="number"
                min={0}
                step="0.01"
                value={receivableForm.originalAmount || ""}
                onChange={(e) => setReceivableForm((prev) => ({ ...prev, originalAmount: Number(e.target.value || 0) }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input
                id="notes"
                value={receivableForm.notes || ""}
                onChange={(e) => setReceivableForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Observaciones"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsReceivableDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateReceivable}
              disabled={
                isSubmittingReceivable ||
                !receivableForm.invoiceNumber.trim() ||
                !receivableForm.saleDate ||
                !receivableForm.invoiceDate ||
                Number(receivableForm.originalAmount || 0) <= 0
              }
            >
              {isSubmittingReceivable ? "Guardando..." : "Registrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-auto max-w-md">
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
