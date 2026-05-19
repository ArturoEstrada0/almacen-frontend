"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePurchaseOrder, usePurchaseOrders, receivePurchaseOrder } from "@/lib/hooks/use-purchase-orders"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { useProducts } from "@/lib/hooks/use-products"
import { useMovements } from "@/lib/hooks/use-inventory"
import { formatCurrency, formatCurrencyWithDenomination } from "@/lib/utils/format"
import { useCurrentUser } from "@/lib/hooks/use-users"
import { Plus, Search, FileText, Eye, Package, CheckCircle, Pencil, X, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { PayableDocumentsList } from "@/components/purchase-orders/payable-documents-list"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ProtectedCreate, ProtectedUpdate } from "@/components/auth/protected-action"
import Spinner2 from "@/components/ui/spinner2"
import { TablePagination, usePagination } from "@/components/ui/table-pagination"


interface PurchaseOrdersListTabProps {
  onCreateNew: () => void
}

export function PurchaseOrdersListTab({ onCreateNew }: PurchaseOrdersListTabProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>("all")
  const [filterDateRange, setFilterDateRange] = useState<any | undefined>(undefined)

  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({})
  const [receiveInvoiceDate, setReceiveInvoiceDate] = useState<string>(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  })
  const [receiveInvoiceNumber, setReceiveInvoiceNumber] = useState<string>("")
  const [receiveInvoiceFile, setReceiveInvoiceFile] = useState<File | null>(null)
  const [isReceivingLoading, setIsReceivingLoading] = useState(false)

  const clampQuantity = (value: number, min: number, max: number) => {
    if (Number.isNaN(value)) return min
    return Math.min(Math.max(value, min), max)
  }

  const [detailsOrderId, setDetailsOrderId] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  const { purchaseOrders, isLoading, mutate } = usePurchaseOrders()
  const { purchaseOrder: detailsOrder, isLoading: detailsLoading } = usePurchaseOrder(detailsOrderId || "")
  const { movements } = useMovements()

  const { suppliers } = useSuppliers()
  const { warehouses } = useWarehouses()
  const { products } = useProducts()
  const { currentUser } = useCurrentUser()

  const formatDateSafely = (value?: string | Date | null) => {
    if (!value) return "-"

    if (typeof value === "string") {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (m) {
        const year = Number(m[1])
        const month = Number(m[2]) - 1
        const day = Number(m[3])
        return new Date(year, month, day).toLocaleDateString()
      }
    }

    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString()
  }

  const parseDateOnly = (value?: string | Date | null): Date | null => {
    if (!value) return null

    if (typeof value === "string") {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (m) {
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      }
    }

    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return null
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  const toIsoDateOnly = (value?: string | Date | null): string => {
    const parsed = parseDateOnly(value)
    if (!parsed) return new Date().toISOString().split("T")[0]

    const year = parsed.getFullYear()
    const month = String(parsed.getMonth() + 1).padStart(2, "0")
    const day = String(parsed.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const getDaysUntilDueText = (dueDateValue?: string | Date | null) => {
    const parsed = parseDateOnly(dueDateValue)
    const today = new Date()
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    // If due date is missing or invalid, use today's date so displays agree with system date
    const dueDate = parsed || todayDate
    const diffMs = dueDate.getTime() - todayDate.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return `Venció hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? "" : "s"}`
    }
    if (diffDays === 0) {
      return "Vence hoy"
    }
    return `Faltan ${diffDays} día${diffDays === 1 ? "" : "s"}`
  }

  const filteredOrders = (purchaseOrders || []).filter((order) => {
    const term = searchTerm.toLowerCase().trim()
    const supplierObj = suppliers.find((s) => s.id === order.supplierId)
    const warehouseObj = warehouses.find((w) => w.id === order.warehouseId)
    const matchesSearch =
      term === "" ||
      (order.orderNumber || "").toLowerCase().includes(term) ||
      (supplierObj?.name || "").toLowerCase().includes(term) ||
      (warehouseObj?.name || "").toLowerCase().includes(term)
    const matchesStatus = filterStatus === "all" || order.status === filterStatus
    const matchesPayment = filterPaymentStatus === "all" || order.paymentStatus === filterPaymentStatus

    let matchesDateRange = true
    if (filterDateRange && filterDateRange.from) {
      const from = filterDateRange.from
      const to = filterDateRange.to || filterDateRange.from
      const od = order.orderDate ? new Date(order.orderDate) : null
      if (!od) matchesDateRange = false
      else {
        // compare only date part
        const odDay = new Date(od.getFullYear(), od.getMonth(), od.getDate())
        const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate())
        const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate())
        matchesDateRange = odDay >= fromDay && odDay <= toDay
      }
    }
    return matchesSearch && matchesStatus && matchesPayment && matchesDateRange
  })

  const { pagedItems: pagedOrders, paginationProps, totalPages } = usePagination(filteredOrders, 20)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completada":
        return "default"
      case "pendiente":
        return "secondary"
      case "parcial":
        return "outline"
      case "cancelada":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "pagado":
        return "default"
      case "pendiente":
        return "secondary"
      case "vencido":
        return "destructive"
      case "parcial":
        return "outline"
      default:
        return "secondary"
    }
  }

  const handleViewPayables = (order: any) => {
    router.push(`/accounts/suppliers/${order.supplierId}`)
  }

  const handleReceiveOrder = (orderId: string) => {
    const today = new Date()
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    const currentOrder = purchaseOrders.find((o) => o.id === orderId)
    const existingInvoiceDate = currentOrder?.invoiceDate ? toIsoDateOnly(currentOrder.invoiceDate) : todayIso

    setSelectedOrder(orderId)
    setReceiveInvoiceDate(existingInvoiceDate)
    setReceiveInvoiceNumber(currentOrder?.invoiceNumber || "")
    setReceiveDialogOpen(true)
  }

  const handleCompleteReception = async () => {
    if (!selectedOrder) return
    setIsReceivingLoading(true)
    try {
      const order = purchaseOrders.find((o) => o.id === selectedOrder)
      if (!order) return

      const userName = currentUser?.fullName || currentUser?.email || "sistema"

      const promises = order.items
          .map((item) => {
          const pending = Math.max(0, item.quantity - item.receivedQuantity)
          const qty = clampQuantity(receiveQuantities[item.id] ?? pending, 0, pending)
          if (qty > 0) {
            return receivePurchaseOrder(order.id, item.id, qty, userName, receiveInvoiceDate, receiveInvoiceNumber, receiveInvoiceFile)
          }
          return Promise.resolve()
        })

      await Promise.all(promises)

      toast.success("Recepción completada", {
        description: "Los productos han sido agregados al inventario",
      })
      mutate()
      setReceiveDialogOpen(false)
      setSelectedOrder(null)
      setReceiveQuantities({})
      const today = new Date()
      setReceiveInvoiceDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`)
      setReceiveInvoiceNumber("")
      setReceiveInvoiceFile(null)
    } catch (e: any) {
      const errorMessage = e?.message || e?.errors?.[0]?.message || "Error al registrar la recepción"
      toast.error("Error al procesar la recepción", {
        description: errorMessage,
      })
    } finally {
      setIsReceivingLoading(false)
    }
  }

  const order = selectedOrder ? purchaseOrders.find((o) => o.id === selectedOrder) : null
  const poReference = detailsOrder ? `PO-${(detailsOrder as any)?.code}` : ""
  const relatedMovements = movements?.filter((m: any) => m.referenceType === "PO" && m.referenceId === detailsOrderId) || []
  const detailsTraceability = ((detailsOrder as any)?.traceability || []) as any[]

  // Group movements by creation date to show "batches" of reception
  const groupedMovements = relatedMovements.reduce((groups: any[], movement: any) => {
    const dateKey = new Date(movement.createdAt).toLocaleDateString()
    const group = groups.find((g) => g.date === dateKey)
    if (group) {
      group.movements.push(movement)
    } else {
      groups.push({ date: dateKey, movements: [movement] })
    }
    return groups
  }, [])

  return (
    <>
      {/* Botón movido dentro del header y hecho sticky */}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, proveedor o almacén..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>

            <DateRangePicker value={filterDateRange} onChange={setFilterDateRange} />

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los pagos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setFilterStatus("all")
                setFilterPaymentStatus("all")
                setFilterDateRange(undefined)
              }}
              className="w-full md:w-auto whitespace-nowrap"
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" style={{ pointerEvents: "auto" }}>
          <Spinner2 />
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Órdenes de Compra</CardTitle>
            <CardDescription>
              {filteredOrders.length} orden{filteredOrders.length !== 1 ? "es" : ""} encontrada
              {filteredOrders.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => paginationProps.onPageChange(1)}
              disabled={paginationProps.currentPage <= 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => paginationProps.onPageChange(paginationProps.currentPage - 1)}
              disabled={paginationProps.currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm mx-2 min-w-20 text-center">
              {paginationProps.currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => paginationProps.onPageChange(paginationProps.currentPage + 1)}
              disabled={paginationProps.currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => paginationProps.onPageChange(totalPages)}
              disabled={paginationProps.currentPage >= totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
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
                    <TableHead>Número</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Almacén</TableHead>
                    <TableHead>Fecha Orden</TableHead>
                    <TableHead>Entrega Esperada</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedOrders.map((rowOrder) => {
                    const isFinalStatus = rowOrder.status === "completada" || rowOrder.status === "cancelada"
                    const editable = !isFinalStatus && (rowOrder.items || []).every((i: any) => Number(i.receivedQuantity || 0) === 0)
                    const isFullyReceived = (rowOrder.items || []).every((i: any) => Number(i.receivedQuantity || 0) >= Number(i.quantity || 0))
                    const supplier = suppliers.find((s) => s.id === rowOrder.supplierId)
                    const warehouse = warehouses.find((w) => w.id === rowOrder.warehouseId)
                    const dueDate = parseDateOnly(rowOrder.dueDate as any)
                    const today = new Date()
                    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                    // Use system date as fallback so displayed vencimiento matches system when dueDate is missing
                    const displayDueDate = dueDate || todayDate
                    const isOverdue = rowOrder.paymentStatus === "pendiente" && dueDate && todayDate > dueDate

                    return (
                      <TableRow key={rowOrder.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono font-medium">{rowOrder.orderNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{supplier?.name}</p>
                            <p className="text-xs text-muted-foreground">{supplier?.code}</p>
                          </div>
                        </TableCell>
                        <TableCell>{warehouse?.name}</TableCell>
                        <TableCell className="text-sm">{formatDateSafely(rowOrder.orderDate as any)}</TableCell>
                        <TableCell className="text-sm">{formatDateSafely(rowOrder.expectedDeliveryDate as any)}</TableCell>
                        <TableCell className="font-medium">{formatCurrencyWithDenomination(rowOrder.total, (rowOrder.currency || rowOrder.items?.[0]?.currency || "MXN") as "MXN" | "USD")}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(rowOrder.status)}>{rowOrder.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={isOverdue ? "destructive" : getPaymentStatusColor(rowOrder.paymentStatus)}>
                              {isOverdue ? "vencido" : rowOrder.paymentStatus}
                            </Badge>
                            {rowOrder.paymentStatus !== "pagado" && (
                              <>
                                <p className="text-xs text-muted-foreground">Vence: {displayDueDate ? displayDueDate.toLocaleDateString() : "-"}</p>
                                <p className="text-xs text-muted-foreground">{getDaysUntilDueText(rowOrder.dueDate as any)}</p>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isFullyReceived && rowOrder.status !== "cancelada" && (
                              <ProtectedUpdate module="purchaseOrders">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleReceiveOrder(rowOrder.id)}
                                  title="Recibir productos"
                                >
                                  <Package className="h-4 w-4" />
                                </Button>
                              </ProtectedUpdate>
                            )}
                            {(rowOrder.items || []).some((item: any) => Number(item.receivedQuantity || 0) > 0) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewPayables(rowOrder)}
                                title="Ver cuentas por pagar"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            <ProtectedUpdate module="purchaseOrders">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => router.push(`/purchase-orders/${rowOrder.id}/edit`)}
                                disabled={!editable}
                                aria-label={editable ? "Editar orden" : "Orden no editable"}
                                title={editable ? "Editar orden" : "La orden no se puede editar porque está completada o cancelada"}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </ProtectedUpdate>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDetailsOrderId(rowOrder.id)
                                setDetailsDialogOpen(true)
                              }}
                              aria-label="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
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

      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-slate-950 border-b pb-4 -mx-6 px-6 pt-6">
            <DialogTitle>Recibir Orden de Compra</DialogTitle>
            <DialogDescription>Registra la recepción de productos de la orden {order?.orderNumber}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6">
          {order && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Proveedor</Label>
                  <p className="font-medium">{order.supplier?.name || suppliers.find((s) => s.id === order.supplierId)?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Almacén</Label>
                  <p className="font-medium">{warehouses.find((w) => w.id === order.warehouseId)?.name}</p>
                </div>
              </div>

              <div>
                <Label>Productos a Recibir</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Ordenado</TableHead>
                      <TableHead>Recibido</TableHead>
                      <TableHead>Por Recibir</TableHead>
                      <TableHead>Cantidad a Recibir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => {
                      const product = products.find((p) => p.id === item.productId)
                      const pending = item.quantity - item.receivedQuantity
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{product?.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.receivedQuantity}</TableCell>
                          <TableCell className="font-medium text-orange-500">{pending}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={receiveQuantities[item.id] ?? pending}
                              min={0}
                              max={pending}
                              step={1}
                              className="w-24"
                              onChange={(e) =>
                                setReceiveQuantities((prev) => ({
                                  ...prev,
                                  [item.id]: clampQuantity(Number.parseInt(e.target.value || "0"), 0, pending),
                                }))
                              }
                              onBlur={(e) =>
                                setReceiveQuantities((prev) => ({
                                  ...prev,
                                  [item.id]: clampQuantity(Number.parseInt(e.target.value || "0"), 0, pending),
                                }))
                              }
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div>
                <Label htmlFor="receive-invoice-date">Fecha de Facturación *</Label>
                <DatePicker value={receiveInvoiceDate} onChange={setReceiveInvoiceDate} />
              </div>

              <div>
                <Label htmlFor="receive-invoice-number">Número de Factura</Label>
                <Input
                  id="receive-invoice-number"
                  value={receiveInvoiceNumber}
                  onChange={(e) => setReceiveInvoiceNumber(e.target.value)}
                  placeholder="Opcional"
                  disabled={isReceivingLoading}
                />
              </div>

              <div>
                <Label htmlFor="receive-invoice-file">Archivo de Factura</Label>
                {receiveInvoiceFile ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md mt-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="flex-1 text-sm font-medium text-green-900">{receiveInvoiceFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const url = URL.createObjectURL(receiveInvoiceFile)
                        window.open(url, "_blank")
                      }}
                      disabled={isReceivingLoading}
                      title="Ver archivo"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setReceiveInvoiceFile(null)}
                      disabled={isReceivingLoading}
                      title="Eliminar archivo"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      id="receive-invoice-file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.xml"
                      onChange={(e) => setReceiveInvoiceFile(e.target.files?.[0] || null)}
                      disabled={isReceivingLoading}
                      className="cursor-pointer mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Formatos aceptados: PDF, JPG, PNG, XML</p>
                  </>
                )}
              </div>

              <div>
                <Label>Notas de Recepción</Label>
                <Textarea placeholder="Observaciones sobre la recepción..." />
              </div>

              <div className="flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-950 border-t py-4 -mx-6 px-6">
                <Button variant="outline" onClick={() => setReceiveDialogOpen(false)} disabled={isReceivingLoading}>
                  Cancelar
                </Button>
                <Button onClick={handleCompleteReception} disabled={isReceivingLoading || !receiveInvoiceDate}>
                  {isReceivingLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Completar Recepción
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-slate-950 border-b pb-4 -mx-6 px-6 pt-6">
            <DialogTitle>Orden de Compra {detailsOrder?.orderNumber || ""}</DialogTitle>
            <DialogDescription>Detalles de la orden de compra</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6">

          {!detailsOrder ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Cargando detalle...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Proveedor</Label>
                  <p className="font-medium">{detailsOrder.supplier?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Almacén</Label>
                  <p className="font-medium">{detailsOrder.warehouse?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha de Orden</Label>
                  <p className="font-medium">{formatDateSafely(detailsOrder.orderDate as any)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Entrega Esperada</Label>
                  <p className="font-medium">{formatDateSafely(detailsOrder.expectedDeliveryDate as any)}</p>
                </div>
              </div>

              {detailsOrder.quotationId && detailsOrder.quotation && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                  <Label className="text-xs text-blue-900 dark:text-blue-100 font-semibold">Cotización Vinculada</Label>
                  <p className="font-medium text-blue-900 dark:text-blue-100">{detailsOrder.quotation.code}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Estado: {detailsOrder.quotation.status}</p>
                </div>
              )}

              {detailsOrder.notes && (
                <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                  <label className="text-xs text-amber-900 dark:text-amber-100 font-semibold">Notas</label>
                  <p className="text-sm text-amber-900 dark:text-amber-100 mt-2 whitespace-pre-wrap">{detailsOrder.notes}</p>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Productos</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Recibido</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailsOrder.items || []).map((item) => {
                      const product = products.find((p) => p.id === item.productId)
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{product?.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.receivedQuantity}</TableCell>
                          <TableCell>{formatCurrencyWithDenomination(item.unitPrice, (detailsOrder.currency || item.currency || "MXN") as "MXN" | "USD")}</TableCell>
                          <TableCell>{formatCurrencyWithDenomination(item.total, (detailsOrder.currency || item.currency || "MXN") as "MXN" | "USD")}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-4 border-t pt-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="font-medium">{formatCurrencyWithDenomination(detailsOrder.subtotal, (detailsOrder.currency || "MXN") as "MXN" | "USD")}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">IVA</p>
                  <p className="font-medium">{formatCurrencyWithDenomination(detailsOrder.tax, (detailsOrder.currency || "MXN") as "MXN" | "USD")}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrencyWithDenomination(detailsOrder.total, (detailsOrder.currency || "MXN") as "MXN" | "USD")}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Factura</Label>
                  {detailsOrder.invoiceFileUrl ? (
                    <div className="text-sm text-muted-foreground">Factura adjunta</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No hay factura adjunta</div>
                  )}
                </div>

                {detailsOrder.invoiceFileUrl && (
                  <div className="mt-2">
                    <PayableDocumentsList documents={[{ label: "Factura", url: detailsOrder.invoiceFileUrl }]} />
                  </div>
                )}

                <Label className="text-xs text-muted-foreground">Historial de Movimientos</Label>
                {detailsLoading ? (
                  <p className="text-sm text-muted-foreground mt-2">Cargando historial...</p>
                ) : relatedMovements.length === 0 && detailsTraceability.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">No hay historial de movimientos registrado.</p>
                ) : (
                  <div className="mt-2 space-y-4 rounded-md border p-3">
                    {groupedMovements.map((group: any, groupIdx: number) => (
                      <div key={`group-${groupIdx}`}>
                        {groupIdx > 0 && <div className="my-3 border-t" />}
                        <div className="text-xs font-semibold text-muted-foreground mb-2">Recepción del {group.date}</div>
                        <div className="space-y-2">
                          {group.movements.map((movement: any) => {
                            const item = movement.items?.[0]
                            const product = products.find((p) => p.id === item?.productId)
                            const movementCurrency = (movement.currency || detailsOrder.currency || item?.currency || "MXN") as "MXN" | "USD"
                            const unitPrice = item?.cost || product?.costPrice
                            const total = unitPrice ? Number(unitPrice) * Number(item?.quantity) : 0
                            return (
                              <div key={movement.id} className="bg-gray-50 dark:bg-slate-900 p-2 rounded">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      ✓ {product?.name} ({item?.quantity} un)
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(movement.createdAt).toLocaleTimeString()} • {movement.userName || "sistema"}
                                    </p>
                                  </div>
                                  <div className="text-right text-sm ml-4">
                                    <p className="font-medium">{formatCurrencyWithDenomination(total, movementCurrency)}</p>
                                    {unitPrice && <p className="text-xs text-muted-foreground">@{formatCurrencyWithDenomination(unitPrice, movementCurrency)}</p>}
                                  </div>
                                </div>
                                {movement.notes && (
                                  <div className="mt-1 text-xs text-muted-foreground border-t pt-1">
                                    <span className="font-semibold">Nota:</span> {movement.notes}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {detailsTraceability.map((event: any) => (
                      <div key={event.id} className="bg-gray-50 dark:bg-slate-900 p-2 rounded">
                        <p className="text-sm font-medium capitalize">{event.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.createdAt).toLocaleString()} • {event.userName || event.userId || "sistema"}
                        </p>
                        {event.reason && <p className="text-xs text-muted-foreground">Motivo: {event.reason}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
