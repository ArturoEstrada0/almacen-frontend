"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  usePurchaseOrders,
  registerPayment,
  useShipmentPayables,
  registerShipmentPayablePayment,
  type ShipmentPayableEntry,
} from "@/lib/hooks/use-purchase-orders"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { formatCurrency } from "@/lib/utils/format"
import { Search, DollarSign, AlertCircle, Calendar } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ProtectedUpdate } from "@/components/auth/protected-action"
import Spinner2 from "@/components/ui/spinner2"
import { TablePagination, usePagination } from "@/components/ui/table-pagination"
import { PayableDocumentsList } from "@/components/purchase-orders/payable-documents-list"

type PayableSource = "purchase-order" | "shipment"

type PayableRow = {
  id: string
  source: PayableSource
  supplierId?: string
  orderNumber: string
  supplierName: string
  supplierCode?: string
  orderDate?: string | Date | null
  dueDate?: string | Date | null
  creditDays?: number
  total: number
  amountPaid: number
  paymentStatus: "pendiente" | "parcial" | "pagado" | "vencido"
  documents?: Array<{ label: string; url: string }>
}

type AccountsPayableTabProps = {
  supplierId?: string
}

export function AccountsPayableTab({ supplierId }: AccountsPayableTabProps = {}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedPayableId, setSelectedPayableId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { purchaseOrders, isLoading: ordersLoading, mutate } = usePurchaseOrders()
  const { shipmentPayables, isLoading: shipmentPayablesLoading, mutate: mutateShipmentPayables } = useShipmentPayables()
  const { suppliers } = useSuppliers()

  const payableRows = useMemo<PayableRow[]>(() => {
    const purchaseOrderRows: PayableRow[] = (purchaseOrders || []).map((order) => {
      const supplier = suppliers.find((s) => s.id === order.supplierId)
      return {
        id: order.id,
        source: "purchase-order",
        supplierId: order.supplierId,
        orderNumber: order.orderNumber,
        supplierName: supplier?.name || "Proveedor",
        supplierCode: supplier?.code,
        orderDate: order.orderDate,
        dueDate: order.dueDate,
        creditDays: Number(order.creditDays || 0),
        total: Number(order.total || 0),
        amountPaid: Number((order as any).amountPaid || 0),
        paymentStatus: (order.paymentStatus as any) || "pendiente",
      }
    })

    const shipmentRows: PayableRow[] = (shipmentPayables || []).map((entry: ShipmentPayableEntry) => {
      const status = (entry.paymentStatus as any) || "pendiente"
      return {
        id: entry.id,
        source: "shipment",
        supplierId: undefined,
        orderNumber: entry.shipmentCode,
        supplierName: entry.partyName || "Transportista",
        supplierCode: entry.trackingFolio || "",
        orderDate: entry.shipmentDate || null,
        dueDate: null,
        creditDays: 0,
        total: Number(entry.amount || 0),
        amountPaid: Number(entry.paidAmount || 0),
        paymentStatus: status,
        documents: entry.documents || (entry.documentUrl ? [{ label: "Factura", url: entry.documentUrl }] : []),
      }
    })

    return [...purchaseOrderRows, ...shipmentRows].filter((row) => row.paymentStatus !== "pagado")
  }, [purchaseOrders, shipmentPayables, suppliers])

  const filteredOrders = payableRows.filter((row) => {
    const matchesSearch =
      row.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || row.paymentStatus === filterStatus
    const matchesSupplier = !supplierId || row.supplierId === supplierId
    return matchesSearch && matchesStatus && matchesSupplier
  })

  const totalPayable = filteredOrders.reduce((sum, row) => sum + Math.max(row.total - row.amountPaid, 0), 0)
  const { pagedItems: pagedOrders, paginationProps } = usePagination(filteredOrders, 20)
  const overdueOrders = filteredOrders.filter((row) => row.dueDate && new Date() > new Date(row.dueDate))
  const totalOverdue = overdueOrders.reduce((sum, row) => sum + Math.max(row.total - row.amountPaid, 0), 0)

  const handleRegisterPayment = (payableId: string) => {
    setSelectedPayableId(payableId)
    setPaymentDialogOpen(true)
    setPaymentAmount("")
    setPaymentMethod("")
    setPaymentReference("")
    setPaymentNotes("")
  }

  const selectedPayable = selectedPayableId ? filteredOrders.find((row) => row.id === selectedPayableId) || payableRows.find((row) => row.id === selectedPayableId) : null

  const handleCompletePayment = async () => {
    if (!selectedPayable || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Por favor ingresa un monto válido")
      return
    }

    const pendingAmount = Math.max(selectedPayable.total - selectedPayable.amountPaid, 0)
    if (Number(paymentAmount) > pendingAmount) {
      toast.error("El monto excede el saldo pendiente")
      return
    }

    setIsSubmitting(true)
    try {
      if (selectedPayable.source === "purchase-order") {
        await registerPayment(selectedPayable.id, {
          amount: Number(paymentAmount),
          paymentMethod,
          reference: paymentReference,
          notes: paymentNotes,
        })
      } else {
        await registerShipmentPayablePayment(selectedPayable.id, {
          amount: Number(paymentAmount),
          paymentMethod,
          reference: paymentReference,
          notes: paymentNotes,
        })
      }

      toast.success("Pago registrado exitosamente")
      await Promise.all([mutate(), mutateShipmentPayables()])
      setPaymentDialogOpen(false)
      setSelectedPayableId(null)
    } catch (error: any) {
      toast.error(error?.message || "Error al registrar el pago")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = ordersLoading || shipmentPayablesLoading
  const pendingAmount = selectedPayable ? Math.max(selectedPayable.total - selectedPayable.amountPaid, 0) : 0

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total por Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayable)}</div>
            <p className="text-xs text-muted-foreground">{filteredOrders.length} cuentas pendientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Vencidos</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(totalOverdue)}</div>
            <p className="text-xs text-muted-foreground">{overdueOrders.length} cuentas vencidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos Vencimientos</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {
                filteredOrders.filter((row) => {
                  if (!row.dueDate) return false
                  const daysUntilDue = Math.ceil((new Date(row.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  return daysUntilDue > 0 && daysUntilDue <= 7
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Próximos 7 días</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por orden/embarque o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Estado de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas por Pagar</CardTitle>
          <CardDescription>Órdenes de compra y embarques con saldo pendiente</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner2 />
            </div>
          ) : (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Proveedor / Transportista</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Fecha Vencimiento</TableHead>
                    <TableHead>Días Crédito</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedOrders.map((row) => {
                    const isOverdue = !!row.dueDate && new Date() > new Date(row.dueDate)
                    const daysUntilDue = row.dueDate
                      ? Math.ceil((new Date(row.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : null

                    return (
                      <TableRow key={`${row.source}-${row.id}`}>
                        <TableCell className="font-mono font-medium">{row.orderNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{row.supplierName}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.source === "shipment" ? "Embarque" : row.supplierCode || "Proveedor"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{row.orderDate ? new Date(row.orderDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>
                          {row.dueDate ? (
                            <div>
                              <p className={`text-sm font-medium ${isOverdue ? "text-red-500" : ""}`}>
                                {new Date(row.dueDate).toLocaleDateString()}
                              </p>
                              {!isOverdue && daysUntilDue !== null && daysUntilDue <= 7 && (
                                <p className="text-xs text-orange-500">Vence en {daysUntilDue} días</p>
                              )}
                              {isOverdue && daysUntilDue !== null && (
                                <p className="text-xs text-red-500">Vencido hace {Math.abs(daysUntilDue)} días</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{row.creditDays ? `${row.creditDays} días` : "-"}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(row.total - row.amountPaid)}</TableCell>
                        <TableCell>
                          <Badge variant={isOverdue ? "destructive" : row.paymentStatus === "parcial" ? "outline" : "secondary"}>
                            {isOverdue ? "vencido" : row.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <ProtectedUpdate module="purchaseOrders">
                            <Button variant="outline" size="sm" onClick={() => handleRegisterPayment(row.id)}>
                              <DollarSign className="mr-2 h-4 w-4" />
                              Registrar Pago
                            </Button>
                          </ProtectedUpdate>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <TablePagination {...paginationProps} />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Registra un pago para {selectedPayable?.source === "shipment" ? "el embarque" : "la orden"} {selectedPayable?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedPayable && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Proveedor / Transportista</Label>
                  <p className="font-medium">{selectedPayable.supplierName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total</Label>
                  <p className="font-medium">{formatCurrency(selectedPayable.total)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Monto Pagado</Label>
                  <p className="font-medium">{formatCurrency(selectedPayable.amountPaid || 0)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Saldo Pendiente</Label>
                  <p className="font-medium text-orange-600">{formatCurrency(pendingAmount)}</p>
                </div>
              </div>

              {selectedPayable.source === "shipment" && selectedPayable.documents && selectedPayable.documents.length > 0 && (
                <PayableDocumentsList documents={selectedPayable.documents} />
              )}

              <div className="space-y-2">
                <Label>Monto del Pago *</Label>
                <Input
                  type="number"
                  step={0.01}
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  disabled={isSubmitting}
                  max={pendingAmount}
                />
              </div>

              <div className="space-y-2">
                <Label>Método de Pago *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="deposito">Depósito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Referencia</Label>
                <Input
                  placeholder="Número de referencia, cheque, etc."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  placeholder="Observaciones sobre el pago..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button onClick={handleCompletePayment} disabled={isSubmitting}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Registrando..." : "Registrar Pago"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
