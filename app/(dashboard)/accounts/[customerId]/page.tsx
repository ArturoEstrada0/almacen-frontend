"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CalendarClock, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import PaymentManagementCard from "@/components/accounts/payment-management-card"
import Spinner2 from "@/components/ui/spinner2"
import { useToast } from "@/hooks/use-toast"
import { formatLocalDateOnly, getLocalDateInputValue } from "@/lib/date-utils"
import {
  CustomerAccountStatement,
  CustomerReceivable,
  RegisterCustomerReceivablePaymentInput,
  useCustomers,
} from "@/lib/hooks/use-customers"

const PAYMENT_REFERENCE_OPTIONS = [
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "efectivo", label: "Efectivo" },
  { value: "deposito", label: "Depósito" },
  { value: "otro", label: "Otro" },
]

export default function CustomerAccountDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const customerId = Array.isArray(params?.customerId) ? params.customerId[0] : (params?.customerId as string | undefined)
  const preselectedReceivableId = searchParams.get("receivableId")
  const { fetchCustomerAccountStatement, registerCustomerReceivablePayment } = useCustomers()
  const { toast } = useToast()

  const [statement, setStatement] = useState<CustomerAccountStatement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedReceivableId, setSelectedReceivableId] = useState<string | null>(null)
  const [attachedInvoiceFile, setAttachedInvoiceFile] = useState<File | null>(null)
  const [attachedInvoicePreviewUrl, setAttachedInvoicePreviewUrl] = useState<string | null>(null)
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const managementSectionRef = useRef<HTMLDivElement | null>(null)
  const [paymentForm, setPaymentForm] = useState<RegisterCustomerReceivablePaymentInput>({
    paymentDate: getLocalDateInputValue(),
    amount: 0,
    reference: "transferencia",
    notes: "",
  })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value || 0)

  const formatDate = (value?: string) => formatLocalDateOnly(value)

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

  const loadStatement = async () => {
    if (!customerId) return null

    setIsLoading(true)
    try {
      const data = await fetchCustomerAccountStatement(customerId)
      setStatement(data)
      if (preselectedReceivableId && data?.receivables?.some((receivable) => receivable.id === preselectedReceivableId)) {
        setSelectedReceivableId(preselectedReceivableId)
      }
      return data
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStatement()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, preselectedReceivableId])

  useEffect(() => {
    if (!preselectedReceivableId || !selectedReceivableId) return
    managementSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [preselectedReceivableId, selectedReceivableId])

  const selectedReceivable = useMemo(() => {
    return statement?.receivables?.find((receivable) => receivable.id === selectedReceivableId) || null
  }, [statement, selectedReceivableId])
  const isReceivablePaid =
    !!selectedReceivable &&
    (selectedReceivable.status === "pagada" || Number(selectedReceivable.balanceAmount || 0) <= 0)
  const hasOverdueReceivables = Number(statement?.totals.overdueCount || 0) > 0

  const selectedReceivableCard = useMemo(() => {
    if (!selectedReceivable) return null
    return {
      invoiceNumber: selectedReceivable.invoiceNumber,
      invoiceDateText: formatDate(selectedReceivable.invoiceDate),
      dueDateText: formatDate(selectedReceivable.dueDate),
      statusLabel: getReceivableStatusLabel(selectedReceivable.status),
      statusVariant: getReceivableStatusVariant(selectedReceivable.status),
      originalAmountText: formatCurrency(selectedReceivable.originalAmount),
      balanceAmountText: formatCurrency(selectedReceivable.balanceAmount),
      paidAmountText: formatCurrency(selectedReceivable.paidAmount),
      recordsCount: selectedReceivable.payments?.length || 0,
    }
  }, [selectedReceivable])

  const selectedReceivableHistoryItems = useMemo(() => {
    return (selectedReceivable?.payments || []).map((payment: any) => ({
      id: payment.id,
      paymentDate: formatDate(payment.paymentDate),
      amount: formatCurrency(payment.amount),
      reference: payment.reference || "-",
      notes: payment.notes,
      invoiceUrl: payment?.invoiceFileUrl || payment?.invoiceUrl || payment?.evidenceUrl || null,
    }))
  }, [selectedReceivable])

  useEffect(() => {
    if (!selectedReceivable) return

    setPaymentForm({
      paymentDate: getLocalDateInputValue(),
      amount: Number(selectedReceivable.balanceAmount || 0),
      reference: "transferencia",
      notes: "",
    })
    setAttachedInvoiceFile(null)
    if (attachedInvoicePreviewUrl) {
      URL.revokeObjectURL(attachedInvoicePreviewUrl)
      setAttachedInvoicePreviewUrl(null)
    }
  }, [selectedReceivableId])

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
      toast({
        title: "Archivo no permitido",
        description: "Solo se permiten facturas en PDF o imágenes.",
        variant: "destructive",
      })
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

  const openReceivable = (receivable: CustomerReceivable) => {
    setSelectedReceivableId(receivable.id)
  }

  const handleRegisterPayment = async () => {
    if (!customerId || !selectedReceivable) return

    setIsSaving(true)
    try {
      const paymentDate = paymentForm.paymentDate || getLocalDateInputValue()
      const amount = Number(paymentForm.amount || 0)
      const reference = paymentForm.reference.trim()

      await registerCustomerReceivablePayment(customerId, selectedReceivable.id, {
        paymentDate,
        amount,
        reference,
        notes: paymentForm.notes?.trim() || undefined,
      }, attachedInvoiceFile)

      const refreshed = await loadStatement()
      const refreshedReceivable = refreshed?.receivables?.find((receivable) => receivable.id === selectedReceivable.id) || null

      setPaymentForm({
        paymentDate: getLocalDateInputValue(),
        amount: Number(refreshedReceivable?.balanceAmount || 0),
        reference: "transferencia",
        notes: "",
      })
      setAttachedInvoiceFile(null)
      if (attachedInvoicePreviewUrl) {
        URL.revokeObjectURL(attachedInvoicePreviewUrl)
        setAttachedInvoicePreviewUrl(null)
      }
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = ""
      }

      toast({
        title: "Éxito",
        description: "Abono registrado correctamente",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo registrar el abono",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner2 />
      </div>
    )
  }

  if (!statement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado de cuenta no disponible</CardTitle>
          <CardDescription>No se pudo cargar la información del cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => router.push("/accounts")}>
            Volver
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button variant="ghost" className="mb-2 gap-2 px-0 hover:bg-transparent" onClick={() => router.push("/accounts")}>
            <ArrowLeft className="h-4 w-4" />
            Volver a clientes
          </Button>
          <h1 className="text-2xl font-bold">Estado de cuenta</h1>
          <p className="text-sm text-muted-foreground">
            {statement.customer.name} · {statement.customer.rfc}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <a href={`/receivables/pending?customerId=${customerId}`}>Ver facturas pendientes</a>
          </Button>
          <Badge variant={statement.customer.active ? "default" : "secondary"}>
            {statement.customer.active ? "Cliente activo" : "Cliente inactivo"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card ref={managementSectionRef}>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Monto original</p>
            <p className="text-lg font-semibold">{formatCurrency(statement.totals.originalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Abonos</p>
            <p className="text-lg font-semibold">{formatCurrency(statement.totals.paidAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Saldo pendiente</p>
            <p className="text-lg font-semibold">{formatCurrency(statement.totals.balanceAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Facturas vencidas</p>
            <p className="text-lg font-semibold">{statement.totals.overdueCount}</p>
          </CardContent>
        </Card>
      </div>

      {hasOverdueReceivables ? (
        <Alert variant="destructive">
          <AlertTitle>Alerta de vencimiento</AlertTitle>
          <AlertDescription>
            Hay {statement?.totals.overdueCount || 0} factura(s) vencida(s) con saldo pendiente. Revisa y registra los abonos correspondientes.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cuentas por cobrar</CardTitle>
            <CardDescription>Selecciona una factura para ver sus abonos y registrar un nuevo pago.</CardDescription>
          </CardHeader>
          <CardContent>
            {(statement.receivables || []).length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                No hay cuentas por cobrar registradas para este cliente.
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
                    {(statement.receivables || []).map((receivable) => (
                      <TableRow key={receivable.id}>
                        <TableCell className="font-medium">{receivable.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(receivable.invoiceDate)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{formatDate(receivable.dueDate)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(receivable.originalAmount)}</TableCell>
                        <TableCell>{formatCurrency(receivable.balanceAmount)}</TableCell>
                        <TableCell>{receivable.payments?.length || 0}</TableCell>
                        <TableCell>
                          <Badge variant={getReceivableStatusVariant(receivable.status)}>
                            {getReceivableStatusLabel(receivable.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => openReceivable(receivable)}>
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
          selectedDocument={selectedReceivableCard}
          isDocumentPaid={isReceivablePaid}
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
            Number(selectedReceivable?.balanceAmount || 0) <= 0
          }
          historyItems={selectedReceivableHistoryItems}
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
