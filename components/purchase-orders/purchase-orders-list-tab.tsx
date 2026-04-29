"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePurchaseOrder, usePurchaseOrders, receivePurchaseOrder } from "@/lib/hooks/use-purchase-orders"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { useProducts } from "@/lib/hooks/use-products"
import { formatCurrency } from "@/lib/utils/format"
import { Plus, Search, FileText, Eye, Package, CheckCircle, Pencil, X } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ProtectedCreate, ProtectedUpdate } from "@/components/auth/protected-action"
import Spinner2 from "@/components/ui/spinner2"
import { TablePagination, usePagination } from "@/components/ui/table-pagination"
import type { PurchaseOrder } from "@/lib/types"

interface PurchaseOrdersListTabProps {
  onCreateNew: () => void
  onEditOrder: (order: PurchaseOrder) => void
}

export function PurchaseOrdersListTab({ onCreateNew, onEditOrder }: PurchaseOrdersListTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>("all")
  const [filterDateRange, setFilterDateRange] = useState<any | undefined>(undefined)

  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({})

  const [detailsOrderId, setDetailsOrderId] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  const { purchaseOrders, isLoading, mutate } = usePurchaseOrders()
  const { purchaseOrder: detailsOrder, isLoading: detailsLoading } = usePurchaseOrder(detailsOrderId || "")

  const { suppliers } = useSuppliers()
  const { warehouses } = useWarehouses()
  const { products } = useProducts()

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

  const { pagedItems: pagedOrders, paginationProps } = usePagination(filteredOrders, 20)

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

  const handleReceiveOrder = (orderId: string) => {
    setSelectedOrder(orderId)
    setReceiveDialogOpen(true)
  }

  const handleCompleteReception = async () => {
    if (!selectedOrder) return
    try {
      const order = purchaseOrders.find((o) => o.id === selectedOrder)
      if (!order) return

      for (const item of order.items) {
        const qty = receiveQuantities[item.id] ?? Math.max(0, item.quantity - item.receivedQuantity)
        if (qty > 0) {
          await receivePurchaseOrder(order.id, item.id, qty)
        }
      }

      toast.success("Recepción completada", {
        description: "Los productos han sido agregados al inventario",
      })
      mutate()
      setReceiveDialogOpen(false)
      setSelectedOrder(null)
      setReceiveQuantities({})
    } catch (e: any) {
      toast.error(e?.message || "Error al registrar la recepción")
    }
  }

  const order = selectedOrder ? purchaseOrders.find((o) => o.id === selectedOrder) : null
  const detailsTraceability = ((detailsOrder as any)?.traceability || []) as any[]

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

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Compra</CardTitle>
          <CardDescription>
            {filteredOrders.length} orden{filteredOrders.length !== 1 ? "es" : ""} encontrada
            {filteredOrders.length !== 1 ? "s" : ""}
          </CardDescription>
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
                    const editable = (rowOrder.items || []).every((i: any) => Number(i.receivedQuantity || 0) === 0)
                    const supplier = suppliers.find((s) => s.id === rowOrder.supplierId)
                    const warehouse = warehouses.find((w) => w.id === rowOrder.warehouseId)
                    const dueDate = rowOrder.dueDate ? new Date(rowOrder.dueDate) : null
                    const isOverdue = rowOrder.paymentStatus === "pendiente" && dueDate && new Date() > dueDate

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
                        <TableCell className="font-medium">{formatCurrency(rowOrder.total)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(rowOrder.status)}>{rowOrder.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={isOverdue ? "destructive" : getPaymentStatusColor(rowOrder.paymentStatus)}>
                              {isOverdue ? "vencido" : rowOrder.paymentStatus}
                            </Badge>
                            {rowOrder.paymentStatus !== "pagado" && (
                              <p className="text-xs text-muted-foreground">Vence: {dueDate ? dueDate.toLocaleDateString() : "-"}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {rowOrder.status !== "completada" && rowOrder.status !== "cancelada" && (
                              <ProtectedUpdate module="purchaseOrders">
                                <Button variant="outline" size="sm" onClick={() => handleReceiveOrder(rowOrder.id)}>
                                  <Package className="mr-2 h-4 w-4" />
                                  Recibir
                                </Button>
                              </ProtectedUpdate>
                            )}
                            <ProtectedUpdate module="purchaseOrders">
                              <Button variant="outline" size="icon" onClick={() => onEditOrder(rowOrder)} disabled={!editable} aria-label="Editar orden">
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
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recibir Orden de Compra</DialogTitle>
            <DialogDescription>Registra la recepción de productos de la orden {order?.orderNumber}</DialogDescription>
          </DialogHeader>
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
                              className="w-24"
                              onChange={(e) =>
                                setReceiveQuantities((prev) => ({ ...prev, [item.id]: Number.parseInt(e.target.value || "0") }))
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
                <Label>Notas de Recepción</Label>
                <Textarea placeholder="Observaciones sobre la recepción..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCompleteReception}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Completar Recepción
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Orden de Compra {detailsOrder?.orderNumber || ""}</DialogTitle>
            <DialogDescription>Detalles de la orden de compra</DialogDescription>
          </DialogHeader>

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
                          <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell>{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-4 border-t pt-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="font-medium">{formatCurrency(detailsOrder.subtotal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">IVA</p>
                  <p className="font-medium">{formatCurrency(detailsOrder.tax)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrency(detailsOrder.total)}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Historial</Label>
                {detailsLoading ? (
                  <p className="text-sm text-muted-foreground mt-2">Cargando historial...</p>
                ) : detailsTraceability.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">No hay historial registrado.</p>
                ) : (
                  <div className="mt-2 space-y-2 rounded-md border p-3">
                    {detailsTraceability.map((event: any) => (
                      <div key={event.id} className="border-b pb-2 last:border-b-0 last:pb-0">
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
        </DialogContent>
      </Dialog>
    </>
  )
}
