"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CalendarClock, Wallet } from "lucide-react"
import PaymentManagementCard from "@/components/accounts/payment-management-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Spinner2 from "@/components/ui/spinner2"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { formatLocalDateOnly, getLocalDateInputValue, parseDateOnly } from "@/lib/date-utils"
import { registerPayment, usePurchaseOrders, getReceiptsByOrder, registerReceiptPayment } from "@/lib/hooks/use-purchase-orders"
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
  payments: SupplierPayablePayment[]
}

type SupplierPayablePayment = {
  id: string
  paymentDate?: string | Date | null
  amount: number
  reference?: string
  notes?: string
  invoiceUrl?: string | null
  isInferred?: boolean
}

export default function SupplierAccountDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const supplierId = Array.isArray(params?.supplierId) ? params.supplierId[0] : (params?.supplierId as string | undefined)
  const { suppliers, isLoading } = useSuppliers()
  const { purchaseOrders, isLoading: isLoadingOrders, mutate } = usePurchaseOrders()
  const [selectedPayableId, setSelectedPayableId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [attachedInvoiceFile, setAttachedInvoiceFile] = useState<File | null>(null)
  const [attachedInvoicePreviewUrl, setAttachedInvoicePreviewUrl] = useState<string | null>(null)
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const [receiptsMap, setReceiptsMap] = useState<Record<string, any[]>>({})
  const [loadingReceipts, setLoadingReceipts] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: getLocalDateInputValue(),
    amount: 0,
    reference: "transferencia",
    notes: "",
  })

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

  useEffect(() => {
    if (!supplierId || !purchaseOrders?.length) {
      setReceiptsMap({})
      return
    }

    let isMounted = true
    const fetchAllReceipts = async () => {
      setLoadingReceipts(true)
      const newReceiptsMap: Record<string, any[]> = {}

      const relevantOrders = (purchaseOrders || []).filter(
        (order) => order.supplierId === supplierId &&
          (Number((order as any).receivedTotal || 0) > 0 || Number(order.amountPaid || 0) > 0)
      )

      for (const order of relevantOrders) {
        try {
          const receipts = await getReceiptsByOrder(order.id)
          if (Array.isArray(receipts) && receipts.length > 0) {
            newReceiptsMap[order.id] = receipts
          }
        } catch (error) {
          console.error(`Failed to fetch receipts for order ${order.id}:`, error)
        }
      }

      if (isMounted) {
        setReceiptsMap(newReceiptsMap)
        setLoadingReceipts(false)
      }
    }

    fetchAllReceipts()
    return () => {
      isMounted = false
    }
  }, [supplierId])

  const payables = useMemo<SupplierPayable[]>(() => {
    if (!supplierId) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const relevantOrders = (purchaseOrders || [])
      .filter((order) => order.supplierId === supplierId)
      .filter((order) => {
        const receivedTotal = Number((order as any).receivedTotal || 0)
        const amountPaid = Number(order.amountPaid || 0)
        return receivedTotal > 0 || amountPaid > 0
      })

    const allPayables: SupplierPayable[] = []

    for (const order of relevantOrders) {
      const receipts = receiptsMap[order.id] || []

      if (receipts.length > 0) {
        // Consolidate all receipts for this order into a single payable entry
        let totalReceivedAmount = 0
        let totalPaidAmount = 0
        let earliestDueDate: Date | null = null
        let hasOverdue = false
        let allPaymentStatuses = new Set<string>()

        for (const receipt of receipts) {
          const receivedAmount = Number(receipt.receivedTotal || 0)
          const paidAmount = Number(receipt.amountPaid || 0)
          totalReceivedAmount += receivedAmount
          totalPaidAmount += paidAmount
          allPaymentStatuses.add(receipt.paymentStatus || "pendiente")

          const dueDate = parseDateOnly(receipt.dueDate)
          if (dueDate) {
            if (!earliestDueDate || dueDate.getTime() < earliestDueDate.getTime()) {
              earliestDueDate = dueDate
            }
            if (receivedAmount - paidAmount > 0 && dueDate.getTime() < today.getTime()) {
              hasOverdue = true
            }
          }
        }

        const balanceAmount = Math.max(totalReceivedAmount - totalPaidAmount, 0)
        let status: "pendiente" | "parcial" | "pagada" | "vencida" = "pendiente"
        if (balanceAmount <= 0) {
          status = "pagada"
        } else if (hasOverdue) {
          status = "vencida"
        } else if (totalPaidAmount > 0) {
          status = "parcial"
        }

        allPayables.push({
          id: order.id,
          invoiceNumber: String(order.invoiceNumber || order.orderNumber || "-"),
          invoiceDate: parseDateOnly(order.invoiceDate || order.orderDate),
          dueDate: earliestDueDate,
          originalAmount: totalReceivedAmount,
          paidAmount: totalPaidAmount,
          balanceAmount,
          status,
          isOverdue: hasOverdue,
          payments: [],
        })
      } else {
        const receivedTotal = Number((order as any).receivedTotal || 0)
        const originalAmount = receivedTotal > 0 ? receivedTotal : Number(order.total || 0)
        const paidAmount = Number(order.amountPaid || 0)
        const balanceAmount = Math.max(originalAmount - paidAmount, 0)
        const due = parseDateOnly(order.dueDate as any)
        const isOverdue = !!due && balanceAmount > 0 && due.getTime() < today.getTime()
        const status = balanceAmount <= 0 ? "pagada" : isOverdue ? "vencida" : paidAmount > 0 ? "parcial" : "pendiente"

        if (balanceAmount > 0 || paidAmount > 0) {
          allPayables.push({
            id: order.id,
            invoiceNumber: String(order.invoiceNumber || order.orderNumber || "-"),
            invoiceDate: parseDateOnly(order.invoiceDate || order.orderDate),
            dueDate: due,
            originalAmount,
            paidAmount,
            balanceAmount,
            status,
            isOverdue,
            payments: [],
          })
        }
      }
    }

    return allPayables
  }, [purchaseOrders, supplierId, receiptsMap])

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

  const selectedPayablePayments = useMemo<SupplierPayablePayment[]>(() => {
    if (!selectedPayable) return []
    if ((selectedPayable.payments || []).length > 0) return selectedPayable.payments
    if (Number(selectedPayable.paidAmount || 0) <= 0) return []

    return [{
      id: `${selectedPayable.id}-inferred-payment`,
      paymentDate: selectedPayable.invoiceDate || null,
      amount: Number(selectedPayable.paidAmount || 0),
      reference: "Pago acumulado",
      notes: "Registro inferido del monto abonado total; no hay detalle histórico por movimiento.",
      isInferred: true,
    }]
  }, [selectedPayable])

  const selectedPayableCard = useMemo(() => {
    if (!selectedPayable) return null
    return {
      accountLabel: `Cuenta ${selectedPayable.invoiceNumber}`,
      invoiceNumber: selectedPayable.invoiceNumber,
      invoiceDateText: formatLocalDateOnly(selectedPayable.invoiceDate as any),
      dueDateText: formatLocalDateOnly(selectedPayable.dueDate as any),
      statusLabel: getStatusLabel(selectedPayable.status),
      statusVariant: getStatusVariant(selectedPayable.status),
      originalAmountText: formatCurrency(selectedPayable.originalAmount),
      balanceAmountText: formatCurrency(selectedPayable.balanceAmount),
      paidAmountText: formatCurrency(selectedPayable.paidAmount),
      recordsCount: selectedPayablePayments.length,
    }
  }, [selectedPayable, selectedPayablePayments])

  const selectedPayableHistoryItems = useMemo(() => {
    return selectedPayablePayments.map((payment) => ({
      id: payment.id,
      paymentDate: formatLocalDateOnly(payment.paymentDate as any),
      amount: formatCurrency(payment.amount),
      reference: payment.reference || "-",
      notes: payment.notes,
      invoiceUrl: payment.invoiceUrl || null,
      helperText: payment.isInferred ? "Sin detalle de abonos históricos" : undefined,
    }))
  }, [selectedPayablePayments])

  const isPayablePaid =
    !!selectedPayable &&
    (selectedPayable.balanceAmount <= 0 || selectedPayable.status === "pagada")

  useEffect(() => {
    const payableId = searchParams?.get("payableId")
    if (!payableId) return

    const exists = payables.some((row) => row.id === payableId)
    if (exists) {
      setSelectedPayableId(payableId)
    }
  }, [searchParams, payables])

  useEffect(() => {
    if (payables.length > 0 && !selectedPayableId) {
      setSelectedPayableId(payables[0].id)
    }
  }, [payables, selectedPayableId])

  useEffect(() => {
    if (!selectedPayable) return
    setPaymentForm({
      paymentDate: getLocalDateInputValue(),
      amount: selectedPayable.balanceAmount,
      reference: "transferencia",
      notes: "",
    })
    setAttachedInvoiceFile(null)
    if (attachedInvoicePreviewUrl) {
      URL.revokeObjectURL(attachedInvoicePreviewUrl)
      setAttachedInvoicePreviewUrl(null)
    }
  }, [selectedPayableId])

  useEffect(() => {
    return () => {
      if (attachedInvoicePreviewUrl) {
        URL.revokeObjectURL(attachedInvoicePreviewUrl)
      }
    }
  }, [attachedInvoicePreviewUrl])

  const handleAttachInvoice = () => {
    attachmentInputRef.current?.click()
  }

  const handleAttachedInvoiceFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setAttachedInvoiceFile(null)
      if (attachedInvoicePreviewUrl) {
        URL.revokeObjectURL(attachedInvoicePreviewUrl)
        setAttachedInvoicePreviewUrl(null)
      }
      return
    }

    const isPdf = file.type === "application/pdf"
    const isImage = file.type.startsWith("image/")

    if (!isPdf && !isImage) {
      setAttachedInvoiceFile(null)
      if (attachedInvoicePreviewUrl) {
        URL.revokeObjectURL(attachedInvoicePreviewUrl)
        setAttachedInvoicePreviewUrl(null)
      }
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = ""
      }
      toast.error("Solo se permiten facturas en PDF o imágenes")
      return
    }

    if (attachedInvoicePreviewUrl) {
      URL.revokeObjectURL(attachedInvoicePreviewUrl)
    }
    setAttachedInvoiceFile(file)
    setAttachedInvoicePreviewUrl(URL.createObjectURL(file))
  }

  const handleViewAttachedInvoice = () => {
    if (!attachedInvoicePreviewUrl) return
    window.open(attachedInvoicePreviewUrl, "_blank", "noopener,noreferrer")
  }

  const handleRemoveAttachedInvoice = () => {
    setAttachedInvoiceFile(null)
    if (attachedInvoicePreviewUrl) {
      URL.revokeObjectURL(attachedInvoicePreviewUrl)
      setAttachedInvoicePreviewUrl(null)
    }
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = ""
    }
  }

  const attachedInvoiceLabel = attachedInvoiceFile
    ? attachedInvoiceFile.name
    : "Adjuntar factura"

  const isReceiptPayable = (payableId: string): boolean => {
    for (const receipts of Object.values(receiptsMap)) {
      if (receipts.some((r) => r.id === payableId)) {
        return true
      }
    }
    return false
  }

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
      const isReceipt = isReceiptPayable(selectedPayable.id)

      if (isReceipt) {
        await registerReceiptPayment(selectedPayable.id, amount)
      } else {
        await registerPayment(selectedPayable.id, {
          amount,
          paymentMethod: paymentForm.reference,
          reference: paymentForm.reference,
          notes: paymentForm.notes || undefined,
          paymentDate: paymentForm.paymentDate || undefined,
          invoiceFile: attachedInvoiceFile,
        })
      }

      await mutate()
      setPaymentForm((prev) => ({
        ...prev,
        paymentDate: getLocalDateInputValue(),
        amount: Math.max(Number(selectedPayable.balanceAmount || 0) - amount, 0),
        reference: "transferencia",
        notes: "",
      }))
      setAttachedInvoiceFile(null)
      if (attachedInvoicePreviewUrl) {
        URL.revokeObjectURL(attachedInvoicePreviewUrl)
        setAttachedInvoicePreviewUrl(null)
      }
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = ""
      }
      toast.success("Pago registrado correctamente")
    } catch (error: any) {
      toast.error(error?.message || "No se pudo registrar el pago")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || isLoadingOrders || loadingReceipts) {
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
          <Button variant="ghost" className="mb-2 gap-2 px-0 hover:bg-transparent" onClick={() => router.push("/accounts?tab=suppliers")}>
            <ArrowLeft className="h-4 w-4" />
            Volver a proveedores
          </Button>
          <h1 className="text-2xl font-bold">Estado de cuenta</h1>
          <p className="text-sm text-muted-foreground">
            {supplier.name} · {supplierRfc}
          </p>
        </div>
        <Button asChild>
          <a href={`/purchase-orders/pending?supplierId=${supplierId}`}>Ver facturas pendientes</a>
        </Button>
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
          <AlertTitle>Alerta de vencimiento</AlertTitle>
          <AlertDescription>
            Hay {totals.overdueCount} factura(s) vencida(s) con saldo pendiente. Revisa y registra los abonos correspondientes.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cuentas por pagar</CardTitle>
            <CardDescription>Selecciona una factura para ver sus abonos y registrar un nuevo pago.</CardDescription>
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
                      <TableRow
                        key={row.id}
                        className={`transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/60 ${selectedPayable?.id === row.id ? "bg-slate-100/80 dark:bg-slate-800/50" : ""}`}
                      >
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
                        <TableCell>{row.payments.length > 0 ? row.payments.length : row.paidAmount > 0 ? 1 : 0}</TableCell>
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

        <PaymentManagementCard
          selectedDocument={selectedPayableCard}
          isDocumentPaid={isPayablePaid}
          paymentDate={paymentForm.paymentDate}
          amount={Number(paymentForm.amount || 0)}
          reference={paymentForm.reference}
          notes={paymentForm.notes || ""}
          referenceOptions={PAYMENT_REFERENCE_OPTIONS}
          onPaymentDateChange={(value) => setPaymentForm((prev) => ({ ...prev, paymentDate: value }))}
          onAmountChange={(value) => setPaymentForm((prev) => ({ ...prev, amount: value }))}
          onReferenceChange={(value) => setPaymentForm((prev) => ({ ...prev, reference: value }))}
          onNotesChange={(value) => setPaymentForm((prev) => ({ ...prev, notes: value }))}
          onRegisterPayment={handleRegisterPayment}
          isSaving={isSaving}
          registerDisabled={
            isSaving ||
            !paymentForm.paymentDate ||
            !paymentForm.reference.trim() ||
            Number(paymentForm.amount || 0) <= 0 ||
            Number(paymentForm.amount || 0) > Number(selectedPayable?.balanceAmount || 0)
          }
          historyItems={selectedPayableHistoryItems}
          showInvoiceColumn={true}
          showAttachmentControls={true}
          attachmentInputRef={attachmentInputRef}
          onAttachmentFileChange={handleAttachedInvoiceFileChange}
          onAttachClick={handleAttachInvoice}
          attachmentLabel={attachedInvoiceLabel}
          hasAttachedFile={!!attachedInvoiceFile}
          onViewAttached={handleViewAttachedInvoice}
          onRemoveAttached={handleRemoveAttachedInvoice}
        />
      </div>
    </div>
  )
}
