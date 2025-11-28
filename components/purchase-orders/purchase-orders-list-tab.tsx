"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePurchaseOrders, receivePurchaseOrder } from "@/lib/hooks/use-purchase-orders"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { useProducts } from "@/lib/hooks/use-products"
import { formatCurrency } from "@/lib/utils/format"
import { Plus, Search, FileText, Eye, Package, CheckCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { toast } from "sonner"
import { ProtectedCreate, ProtectedUpdate } from "@/components/auth/protected-action"

interface PurchaseOrdersListTabProps {
  onCreateNew: () => void
}

export function PurchaseOrdersListTab({ onCreateNew }: PurchaseOrdersListTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>("all")
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)

  const { purchaseOrders, mutate } = usePurchaseOrders()
  const { suppliers } = useSuppliers()
  const { warehouses } = useWarehouses()
  const { products } = useProducts()

  const filteredOrders = (purchaseOrders || []).filter((order) => {
    const matchesSearch = (order.orderNumber || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || order.status === filterStatus
    const matchesPayment = filterPaymentStatus === "all" || order.paymentStatus === filterPaymentStatus
    return matchesSearch && matchesStatus && matchesPayment
  })

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

  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({})

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
      console.error(e)
      toast.error(e?.message || "Error al registrar la recepción")
    }
  }

  const order = selectedOrder ? purchaseOrders.find((o) => o.id === selectedOrder) : null

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Órdenes de Compra</h2>
          <p className="text-sm text-muted-foreground">Gestiona y recibe órdenes de compra</p>
        </div>
        <ProtectedCreate module="purchaseOrders">
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Orden
          </Button>
        </ProtectedCreate>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número de orden..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Estado de orden" />
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
                <SelectValue placeholder="Estado de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los pagos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Compra</CardTitle>
          <CardDescription>
            {filteredOrders.length} orden{filteredOrders.length !== 1 ? "es" : ""} encontrada
            {filteredOrders.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {filteredOrders.map((order) => {
                const supplier = suppliers.find((s) => s.id === order.supplierId)
                const warehouse = warehouses.find((w) => w.id === order.warehouseId)
                const dueDate = order.dueDate ? new Date(order.dueDate) : null
                const orderDate = order.orderDate ? new Date(order.orderDate) : null
                const expectedDate = order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : null
                const isOverdue = order.paymentStatus === "pendiente" && dueDate && new Date() > dueDate

                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-medium">{order.orderNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{supplier?.businessName}</p>
                        <p className="text-xs text-muted-foreground">{supplier?.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>{warehouse?.name}</TableCell>
                    <TableCell className="text-sm">{orderDate ? orderDate.toLocaleDateString() : "-"}</TableCell>
                    <TableCell className="text-sm">{expectedDate ? expectedDate.toLocaleDateString() : "-"}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={isOverdue ? "destructive" : getPaymentStatusColor(order.paymentStatus)}>
                          {isOverdue ? "vencido" : order.paymentStatus}
                        </Badge>
                        {order.paymentStatus !== "pagado" && (
                          <p className="text-xs text-muted-foreground">Vence: {dueDate ? dueDate.toLocaleDateString() : "-"}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status !== "completada" && order.status !== "cancelada" && (
                          <ProtectedUpdate module="purchaseOrders">
                            <Button variant="outline" size="sm" onClick={() => handleReceiveOrder(order.id)}>
                              <Package className="mr-2 h-4 w-4" />
                              Recibir
                            </Button>
                          </ProtectedUpdate>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Orden de Compra {order.orderNumber}</DialogTitle>
                              <DialogDescription>Detalles de la orden de compra</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Proveedor</Label>
                                  <p className="font-medium">{supplier?.businessName}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Almacén</Label>
                                  <p className="font-medium">{warehouse?.name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Fecha de Orden</Label>
                                  <p className="font-medium">{orderDate ? orderDate.toLocaleDateString() : "-"}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Entrega Esperada</Label>
                                  <p className="font-medium">{expectedDate ? expectedDate.toLocaleDateString() : "-"}</p>
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
                                    {order.items.map((item) => {
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
                                  <p className="font-medium">{formatCurrency(order.subtotal)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">IVA</p>
                                  <p className="font-medium">{formatCurrency(order.tax)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Total</p>
                                  <p className="text-lg font-bold">{formatCurrency(order.total)}</p>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Receive Order Dialog */}
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
                            <p className="font-medium">{suppliers.find((s) => s.id === order.supplierId)?.businessName}</p>
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
    </>
  )
}
