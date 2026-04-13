"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CalendarClock, Eye, ReceiptText, Trash2, Upload, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  const selectedReceivablePayments = selectedReceivable?.payments || []
  const hasManyPayments = selectedReceivablePayments.length > 2
  const isReceivablePaid =
    !!selectedReceivable &&
    (selectedReceivable.status === "pagada" || Number(selectedReceivable.balanceAmount || 0) <= 0)
  const hasOverdueReceivables = Number(statement?.totals.overdueCount || 0) > 0

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

  const getPaymentInvoiceUrl = (payment: any): string | null => {
    return payment?.invoiceFileUrl || payment?.invoiceUrl || payment?.evidenceUrl || null
  }

  const handleViewPaymentInvoice = (payment: any) => {
    const url = getPaymentInvoiceUrl(payment)
    if (!url) return
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const renderPaymentInvoiceCell = (payment: any) => {
    const url = getPaymentInvoiceUrl(payment)
    if (!url) {
      return <span className="text-xs text-muted-foreground">Sin factura</span>
    }

    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 gap-1 px-2"
        onClick={() => handleViewPaymentInvoice(payment)}
      >
        <Eye className="h-3.5 w-3.5" />
        Ver
      </Button>
    )
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

        <Card>
          <CardHeader>
            <CardTitle>Gestión de abonos</CardTitle>
            <CardDescription>Registra múltiples abonos para la factura seleccionada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedReceivable ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                Selecciona una factura para revisar su historial y capturar un nuevo abono.
              </div>
            ) : (
              <>
                <div className="space-y-3 rounded-md border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{selectedReceivable.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        Emitida el {formatDate(selectedReceivable.invoiceDate)} · Vence el {formatDate(selectedReceivable.dueDate)}
                      </p>
                    </div>
                    <Badge variant={getReceivableStatusVariant(selectedReceivable.status)}>
                      {getReceivableStatusLabel(selectedReceivable.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Original</p>
                      <p className="font-semibold">{formatCurrency(selectedReceivable.originalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Saldo</p>
                      <p className="font-semibold">{formatCurrency(selectedReceivable.balanceAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Abonos</p>
                      <p className="font-semibold">{formatCurrency(selectedReceivable.paidAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Registros</p>
                      <p className="font-semibold">{selectedReceivable.payments?.length || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {isReceivablePaid ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      Esta factura ya está pagada. No se pueden registrar nuevos abonos.
                    </div>
                  ) : (
                    <div className="space-y-4 rounded-md border p-4">
                      <div>
                        <h3 className="text-sm font-semibold">Nuevo abono</h3>
                        <p className="text-xs text-muted-foreground">
                          El saldo se recalcula automáticamente después de guardar.
                        </p>
                      </div>

                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="paymentDate">Fecha</Label>
                          <Input
                            id="paymentDate"
                            type="date"
                            value={paymentForm.paymentDate}
                            onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="paymentAmount">Monto</Label>
                          <Input
                            id="paymentAmount"
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
                          <Label htmlFor="paymentNotes">Notas</Label>
                          <Textarea
                            id="paymentNotes"
                            value={paymentForm.notes || ""}
                            onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                            placeholder="Referencia bancaria, folio del cheque, observaciones, etc."
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Input
                          ref={attachmentInputRef}
                          type="file"
                          accept="application/pdf,image/*"
                          className="hidden"
                          onChange={handleAttachedInvoiceFileChange}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="gap-2"
                            onClick={handleRegisterPayment}
                            disabled={
                              isSaving ||
                              !paymentForm.paymentDate ||
                              !paymentForm.reference.trim() ||
                              Number(paymentForm.amount || 0) <= 0 ||
                              Number(selectedReceivable.balanceAmount || 0) <= 0
                            }
                          >
                            <Wallet className="h-4 w-4" />
                            {isSaving ? "Guardando..." : "Registrar abono"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="max-w-60 gap-2"
                            onClick={handleAttachInvoice}
                          >
                            <Upload className="h-4 w-4" />
                            <span className="truncate">{attachedInvoiceLabel}</span>
                          </Button>
                          {attachedInvoiceFile ? (
                            <>
                              <Button type="button" variant="default" className="gap-2" onClick={handleViewAttachedInvoice}>
                                <Eye className="h-4 w-4" />
                                Ver
                              </Button>
                              <Button type="button" variant="destructive" className="gap-2" onClick={handleRemoveAttachedInvoice}>
                                <Trash2 className="h-4 w-4" />
                                Borrar
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Historial de abonos</h3>
                    </div>

                    {selectedReceivablePayments.length === 0 ? (
                      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        Aún no hay abonos registrados para esta factura.
                      </div>
                    ) : (
                      <div className={hasManyPayments ? "max-h-64 overflow-y-auto overflow-x-auto rounded-md border" : "rounded-md border"}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Monto</TableHead>
                              <TableHead>Referencia</TableHead>
                              <TableHead>Factura</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedReceivablePayments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">{payment.reference || "-"}</p>
                                    {payment.notes ? <p className="text-xs text-muted-foreground">{payment.notes}</p> : null}
                                  </div>
                                </TableCell>
                                <TableCell>{renderPaymentInvoiceCell(payment)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
