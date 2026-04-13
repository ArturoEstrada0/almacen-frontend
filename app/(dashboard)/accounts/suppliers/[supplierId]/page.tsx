"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, CalendarClock, DollarSign, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import Spinner2 from "@/components/ui/spinner2"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { formatLocalDateOnly, parseDateOnly } from "@/lib/date-utils"
import { registerPayment, usePurchaseOrders } from "@/lib/hooks/use-purchase-orders"
import { toast } from "sonner"

const PAYMENT_REFERENCE_OPTIONS = [
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "efectivo", label: "Efectivo" },
  { value: "deposito", label: "Depósito" },
  { value: "otro", label: "Otro" },
]

type SupplierPayable = {
  id: string
  invoiceNumber: string
  invoiceDate?: string | Date | null
  dueDate?: string | Date | null
  originalAmount: number
  paidAmount: number
  balanceAmount: number
  status: "pendiente" | "parcial" | "pagada" | "vencida"
  isOverdue: boolean
}

export default function SupplierAccountDetailPage() {
  const router = useRouter()
  const params = useParams()
  const supplierId = Array.isArray(params?.supplierId) ? params.supplierId[0] : (params?.supplierId as string | undefined)
  const { suppliers, isLoading } = useSuppliers()
  const { purchaseOrders, isLoading: isLoadingOrders, mutate } = usePurchaseOrders()
  const [selectedPayableId, setSelectedPayableId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ amount: 0, reference: "transferencia", notes: "" })

  const supplier = useMemo(
    () => suppliers.find((item: any) => item.id === supplierId) || null,
    [suppliers, supplierId],
  )
  const supplierRfc = supplier ? ((supplier as any).rfc || (supplier as any).taxId || "SIN RFC") : "SIN RFC"

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value || 0)

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "pagada") return "default"
    if (status === "vencida") return "destructive"
    if (status === "parcial") return "secondary"
    return "outline"
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendiente: "Pendiente",
      parcial: "Parcial",
      pagada: "Pagada",
      vencida: "Vencida",
    }
    return labels[status] || status
  }

  const payables = useMemo<SupplierPayable[]>(() => {
    if (!supplierId) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (purchaseOrders || [])
      .filter((order) => order.supplierId === supplierId)
      .map((order: any) => {
        const originalAmount = Number(order.total || 0)
        const paidAmount = Number(order.amountPaid || 0)
        const balanceAmount = Math.max(originalAmount - paidAmount, 0)
        const due = parseDateOnly(order.dueDate as any)
        const isOverdue = !!due && balanceAmount > 0 && due.getTime() < today.getTime()
        const status = balanceAmount <= 0 ? "pagada" : isOverdue ? "vencida" : paidAmount > 0 ? "parcial" : "pendiente"

        return {
          id: order.id,
          invoiceNumber: String(order.invoiceNumber || order.orderNumber || "-"),
          invoiceDate: order.invoiceDate || order.orderDate,
          dueDate: order.dueDate,
          originalAmount,
          paidAmount,
          balanceAmount,
          status,
          isOverdue,
        }
      })
  }, [purchaseOrders, supplierId])

  const totals = useMemo(
    () =>
      payables.reduce(
        (acc, row) => {
          acc.originalAmount += row.originalAmount
          acc.paidAmount += row.paidAmount
          acc.balanceAmount += row.balanceAmount
          if (row.isOverdue) acc.overdueCount += 1
          return acc
        },
        { originalAmount: 0, paidAmount: 0, balanceAmount: 0, overdueCount: 0 },
      ),
    [payables],
  )

  const selectedPayable = useMemo(
    () => payables.find((row) => row.id === selectedPayableId) || null,
    [payables, selectedPayableId],
  )

  const isPayablePaid = !selectedPayable || selectedPayable.balanceAmount <= 0 || selectedPayable.status === "pagada"

  useEffect(() => {
    if (!selectedPayable) return
    setPaymentForm({ amount: selectedPayable.balanceAmount, reference: "transferencia", notes: "" })
  }, [selectedPayableId])

  const handleRegisterPayment = async () => {
    if (!selectedPayable) return

    const amount = Number(paymentForm.amount || 0)
    if (amount <= 0) {
      toast.error("Ingresa un monto válido")
      return
    }

    if (amount > selectedPayable.balanceAmount) {
      toast.error("El monto excede el saldo pendiente")
      return
    }

    setIsSaving(true)
    try {
      await registerPayment(selectedPayable.id, {
        amount,
        paymentMethod: paymentForm.reference,
        reference: paymentForm.reference,
        notes: paymentForm.notes || undefined,
      })
      await mutate()
      toast.success("Pago registrado correctamente")
    } catch (error: any) {
      toast.error(error?.message || "No se pudo registrar el pago")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || isLoadingOrders) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner2 />
      </div>
    )
  }

  if (!supplierId || !supplier) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proveedor no disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => router.push("/accounts")}>Volver</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button variant="ghost" className="mb-2 gap-2 px-0 hover:bg-transparent" onClick={() => router.push("/accounts")}>
            <ArrowLeft className="h-4 w-4" />
            Volver a proveedores
          </Button>
          <h1 className="text-2xl font-bold">Estado de cuenta</h1>
          <p className="text-sm text-muted-foreground">
            {supplier.name} · {supplierRfc}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Monto original</p>
            <p className="text-lg font-semibold">{formatCurrency(totals.originalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Abonos</p>
            <p className="text-lg font-semibold">{formatCurrency(totals.paidAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Saldo pendiente</p>
            <p className="text-lg font-semibold">{formatCurrency(totals.balanceAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Facturas vencidas</p>
            <p className="text-lg font-semibold">{totals.overdueCount}</p>
          </CardContent>
        </Card>
      </div>

      {totals.overdueCount > 0 ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Alerta de vencimiento</AlertTitle>
          <AlertDescription>
            Hay {totals.overdueCount} factura(s) vencida(s) con saldo pendiente.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cuentas por pagar</CardTitle>
            <CardDescription>Selecciona una factura para revisar pagos y registrar un nuevo abono.</CardDescription>
          </CardHeader>
          <CardContent>
            {payables.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                No hay cuentas por pagar registradas para este proveedor.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factura</TableHead>
                      <TableHead>Emisión</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Abonos</TableHead>
                      <TableHead>Estatus</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payables.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.invoiceNumber}</TableCell>
                        <TableCell>{formatLocalDateOnly(row.invoiceDate as any)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{formatLocalDateOnly(row.dueDate as any)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(row.originalAmount)}</TableCell>
                        <TableCell>{formatCurrency(row.balanceAmount)}</TableCell>
                        <TableCell>{row.paidAmount > 0 ? 1 : 0}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(row.status)}>{getStatusLabel(row.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedPayableId(row.id)}>
                            <Wallet className="h-4 w-4" />
                            Ver abonos
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gestión de abonos</CardTitle>
            <CardDescription>Registra abonos para la factura seleccionada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedPayable ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                Selecciona una factura para revisar su saldo y capturar un nuevo abono.
              </div>
            ) : (
              <>
                <div className="space-y-3 rounded-md border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{selectedPayable.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        Emitida el {formatLocalDateOnly(selectedPayable.invoiceDate as any)} · Vence el {formatLocalDateOnly(selectedPayable.dueDate as any)}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(selectedPayable.status)}>
                      {getStatusLabel(selectedPayable.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Original</p>
                      <p className="font-semibold">{formatCurrency(selectedPayable.originalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Saldo</p>
                      <p className="font-semibold">{formatCurrency(selectedPayable.balanceAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Abonos</p>
                      <p className="font-semibold">{formatCurrency(selectedPayable.paidAmount)}</p>
                    </div>
                  </div>
                </div>

                {isPayablePaid ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    Esta factura ya está pagada. No se pueden registrar nuevos abonos.
                  </div>
                ) : (
                  <div className="space-y-4 rounded-md border p-4">
                    <div>
                      <h3 className="text-sm font-semibold">Nuevo abono</h3>
                      <p className="text-xs text-muted-foreground">El saldo se recalcula automáticamente después de guardar.</p>
                    </div>

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supplierPaymentAmount">Monto</Label>
                        <Input
                          id="supplierPaymentAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={paymentForm.amount || ""}
                          onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: Number(e.target.value || 0) }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Referencia</Label>
                        <Select
                          value={paymentForm.reference}
                          onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, reference: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una referencia" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_REFERENCE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="supplierPaymentNotes">Notas</Label>
                        <Textarea
                          id="supplierPaymentNotes"
                          value={paymentForm.notes || ""}
                          onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                          placeholder="Referencia bancaria, folio del cheque, observaciones, etc."
                          rows={3}
                        />
                      </div>
                    </div>

                    <Button
                      className="gap-2"
                      onClick={handleRegisterPayment}
                      disabled={
                        isSaving ||
                        Number(paymentForm.amount || 0) <= 0 ||
                        Number(paymentForm.amount || 0) > Number(selectedPayable.balanceAmount || 0)
                      }
                    >
                      <DollarSign className="h-4 w-4" />
                      {isSaving ? "Guardando..." : "Registrar abono"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
