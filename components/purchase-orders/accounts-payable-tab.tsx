"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePurchaseOrders } from "@/lib/hooks/use-purchase-orders"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { formatCurrency } from "@/lib/utils/format"
import { Search, DollarSign, AlertCircle, Calendar } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export function AccountsPayableTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)

  const { purchaseOrders } = usePurchaseOrders()
  const { suppliers } = useSuppliers()

  const payableOrders = (purchaseOrders || []).filter((order) => order.paymentStatus !== "pagado")

  const filteredOrders = payableOrders.filter((order) => {
  const supplier = suppliers.find((s) => s.id === order.supplierId)
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier?.businessName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || order.paymentStatus === filterStatus
    return matchesSearch && matchesStatus
  })

  const totalPayable = filteredOrders.reduce((sum, order) => sum + order.total, 0)
  const overdueOrders = filteredOrders.filter((order) => new Date() > new Date(order.dueDate))
  const totalOverdue = overdueOrders.reduce((sum, order) => sum + order.total, 0)

  const handleRegisterPayment = (orderId: string) => {
    setSelectedOrder(orderId)
    setPaymentDialogOpen(true)
  }

  const handleCompletePayment = () => {
    toast.success("Pago registrado exitosamente")
    setPaymentDialogOpen(false)
    setSelectedOrder(null)
  }

  const order = selectedOrder ? (purchaseOrders || []).find((o) => o.id === selectedOrder) : null

  return (
    <>
      <div>
        <h2 className="text-2xl font-bold">Cuentas por Pagar</h2>
        <p className="text-sm text-muted-foreground">Gestiona los pagos pendientes a proveedores</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total por Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayable)}</div>
            <p className="text-xs text-muted-foreground">{filteredOrders.length} órdenes pendientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Vencidos</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(totalOverdue)}</div>
            <p className="text-xs text-muted-foreground">{overdueOrders.length} órdenes vencidas</p>
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
                filteredOrders.filter((order) => {
                  const daysUntilDue = Math.ceil(
                    (order.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                  )
                  return daysUntilDue > 0 && daysUntilDue <= 7
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Próximos 7 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por orden o proveedor..."
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

      {/* Payables Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cuentas por Pagar</CardTitle>
          <CardDescription>Órdenes de compra con pagos pendientes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha Orden</TableHead>
                <TableHead>Fecha Vencimiento</TableHead>
                <TableHead>Días Crédito</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const supplier = suppliers.find((s) => s.id === order.supplierId)
                const isOverdue = new Date() > new Date(order.dueDate)
                const daysUntilDue = Math.ceil((new Date(order.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{supplier?.businessName}</p>
                        <p className="text-xs text-muted-foreground">{supplier?.code}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div>
                          <p className={`text-sm font-medium ${isOverdue ? "text-red-500" : ""}`}>
                          {new Date(order.dueDate).toLocaleDateString()}
                        </p>
                        {!isOverdue && daysUntilDue <= 7 && (
                          <p className="text-xs text-orange-500">Vence en {daysUntilDue} días</p>
                        )}
                        {isOverdue && (
                          <p className="text-xs text-red-500">Vencido hace {Math.abs(daysUntilDue)} días</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{order.creditDays} días</TableCell>
                    <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          isOverdue ? "destructive" : order.paymentStatus === "parcial" ? "outline" : "secondary"
                        }
                      >
                        {isOverdue ? "vencido" : order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleRegisterPayment(order.id)}>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Registrar Pago
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>Registra un pago para la orden {order?.orderNumber}</DialogDescription>
          </DialogHeader>
          {order && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Proveedor</Label>
                  <p className="font-medium">{suppliers.find((s) => s.id === order.supplierId)?.businessName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total de la Orden</Label>
                  <p className="font-medium">{formatCurrency(order.total)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Monto del Pago *</Label>
                <Input type="number" step={0.01} placeholder="0.00" />
              </div>

              <div className="space-y-2">
                <Label>Método de Pago *</Label>
                <Select>
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
                <Input placeholder="Número de referencia, cheque, etc." />
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea placeholder="Observaciones sobre el pago..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCompletePayment}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Registrar Pago
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
