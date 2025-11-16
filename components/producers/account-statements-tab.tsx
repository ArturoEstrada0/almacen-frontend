"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, Download, DollarSign, TrendingUp, TrendingDown, FileText } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import type { PaymentMethod } from "@/lib/types"
import { useProducers, useProducerAccountStatement, createPayment as apiCreatePayment } from "@/lib/hooks/use-producers"

function safeCurrency(val: any) {
  // Si el valor es string y tiene el mismo número repetido, lo corregimos
  if (typeof val === "string" && val.length % 2 === 0) {
    const half = val.length / 2;
    // Solo si ambas mitades son iguales y el valor es mayor a 1 dígito
    if (half > 1 && val.slice(0, half) === val.slice(half)) {
      // Si la mitad es un solo dígito, lo convertimos a número
      if (/^\d+$/.test(val.slice(0, half))) {
        val = val.slice(0, half);
      }
    }
  }
  const num = typeof val === "string" ? Number(val.replace(/[^\d.-]/g, "")) : Number(val);
  return isNaN(num) ? "$0.00" : formatCurrency(num);
}

function parseAmountToNumber(val: any) {
  if (val === undefined || val === null || val === "") return 0
  if (typeof val === "number") return val
  let s = String(val).trim()
  // Remove any currency symbols and spaces
  s = s.replace(/[^0-9.,-]/g, "")

  // If both dot and comma exist, decide which is decimal by position
  if (s.indexOf(".") !== -1 && s.indexOf(",") !== -1) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      // comma is decimal separator, remove dots (thousands)
      s = s.replace(/\./g, "").replace(/,/g, ".")
    } else {
      // dot is decimal separator, remove commas
      s = s.replace(/,/g, "")
    }
  } else if (s.indexOf(",") !== -1) {
    // only comma present => treat as decimal separator
    s = s.replace(/\./g, "").replace(/,/g, ".")
  } else {
    // only dot or neither -> remove any grouping dots
    // keep single dot as decimal
    const parts = s.split(".")
    if (parts.length > 1) {
      // join all except last as thousands, keep last as decimals
      s = parts.slice(0, -1).join("") + "." + parts[parts.length - 1]
    }
  }

  const num = Number(s)
  return isNaN(num) ? 0 : num
}

export function AccountStatementsTab() {
  const [selectedProducer, setSelectedProducer] = useState<string>("")
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<"pago" | "abono" | "devolucion" | null>(null)

  // Payment form state
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transferencia")
  const [reference, setReference] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  const { producers } = useProducers()
  const { accountStatement, mutate: mutateAccount } = useProducerAccountStatement(selectedProducer)
  const producer = (producers || []).find((p) => p.id === selectedProducer)

  const movementsRaw: any[] = (accountStatement && (accountStatement as any).movements) || []

  // Map backend movement shape to UI-friendly shape
  const mappedMovements: any[] = movementsRaw.map((m: any) => ({
    id: m.id,
    date: m.createdAt ? new Date(m.createdAt) : m.date ? new Date(m.date) : new Date(),
    type: m.type === "cargo" ? "asignacion" : m.type === "abono" ? "venta" : "pago",
    description: m.description,
    referenceNumber: m.referenceCode || m.reference_code || m.referenceNumber || "",
    // Show asignaciones (cargo) as negative amounts so they render red and with a minus
  // Show asignaciones (cargo) and pagos as negative amounts so they render red and with a minus
  amount: m.type === "cargo" || m.type === "pago" ? -Number(m.amount) : Number(m.amount),
    // Balance from backend may be string (decimal) or number; normalize to Number
    balance: Number(m.balance),
  }))

  const totalAssigned = mappedMovements
    .filter((m) => m.type === "asignacion")
    .reduce((sum, m) => sum + Math.abs(m.amount), 0)

  const totalReceived = mappedMovements.filter((m) => m.type === "venta").reduce((sum, m) => sum + m.amount, 0)

  const totalPaid = mappedMovements.filter((m) => m.type === "pago").reduce((sum, m) => sum + Math.abs(m.amount), 0)

  const handleSavePayment = () => {
    ;(async () => {
      try {
        // Traducir método de pago a inglés
        const methodMap: Record<string, string> = {
          efectivo: "cash",
          transferencia: "transfer",
          cheque: "check",
          deposito: "other",
        }
        const payload = {
          producerId: selectedProducer,
          amount: parseAmountToNumber(amount),
          method: methodMap[paymentMethod] || "other",
          reference,
          notes: paymentNotes,
        }
        await apiCreatePayment(payload)
        // Refresh account statement and producers list (balance)
        await mutateAccount()
        // Reset form
        setAmount("")
        setPaymentMethod("transferencia")
        setReference("")
        setPaymentNotes("")
        setInvoiceFile(null)
        setReceiptFile(null)
        setIsPaymentDialogOpen(false)
      } catch (err) {
        console.error("Failed saving payment", err)
        alert("Error al guardar pago: " + (err as any)?.message || err)
      }
    })()
  }

  const handleExport = () => {
    if (!accountStatement) return alert("No hay estado de cuenta para exportar.")
    // Exportar como CSV
    const rows = [
      ["Fecha", "Tipo", "Referencia", "Monto", "Notas"],
      ...((accountStatement.movements || []).map((m: any) => [
        m.date || m.movementDate || "",
        m.type || "",
        m.reference || m.code || "",
        m.amount || m.total || "",
        m.notes || ""
      ]))
    ]
    const csvContent = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `estado_cuenta_${selectedProducer || "productor"}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Estados de Cuenta</CardTitle>
          <CardDescription>Visualiza el estado de cuenta de cada productor y registra pagos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="producer">Seleccionar Productor</Label>
                <Select value={selectedProducer} onValueChange={setSelectedProducer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar productor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(producers || []).map((producer) => (
                          <SelectItem key={producer.id} value={producer.id}>
                            {producer.code} - {producer.name}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedProducer && (
                <div className="flex items-end gap-2">
                  <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Registrar movimiento
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Registrar Movimiento</DialogTitle>
                          <DialogDescription>Selecciona el tipo de movimiento que quieres registrar para {producer?.name}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedAction("pago")}
                              onKeyDown={(e) => e.key === "Enter" && setSelectedAction("pago")}
                              className={`rounded-lg border p-4 cursor-pointer ${selectedAction === "pago" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"}`}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <DollarSign className="h-6 w-6 text-blue-600" />
                                <div className="text-center">
                                  <p className="text-sm font-medium">Registrar Pago</p>
                                  <p className="text-xs text-muted-foreground">Registrar un pago al productor</p>
                                </div>
                              </div>
                            </div>

                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedAction("abono")}
                              onKeyDown={(e) => e.key === "Enter" && setSelectedAction("abono")}
                              className={`rounded-lg border p-4 cursor-pointer ${selectedAction === "abono" ? "border-green-600 bg-green-50" : "border-gray-200 bg-white"}`}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                                <div className="text-center">
                                  <p className="text-sm font-medium">Registrar Abono</p>
                                  <p className="text-xs text-muted-foreground">Registrar un abono (crédito/anticipado)</p>
                                </div>
                              </div>
                            </div>

                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedAction("devolucion")}
                              onKeyDown={(e) => e.key === "Enter" && setSelectedAction("devolucion")}
                              className={`rounded-lg border p-4 cursor-pointer ${selectedAction === "devolucion" ? "border-red-600 bg-red-50" : "border-gray-200 bg-white"}`}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <TrendingDown className="h-6 w-6 text-red-600" />
                                <div className="text-center">
                                  <p className="text-sm font-medium">Registrar Devolución</p>
                                  <p className="text-xs text-muted-foreground">Registrar una devolución que afecta el saldo</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Form area for selected action */}
                          {selectedAction ? (
                            <div className="mt-2 border-t pt-4">
                              <p className="text-sm font-medium mb-2">Formulario: {selectedAction === "pago" ? "Pago" : selectedAction === "abono" ? "Abono" : "Devolución"}</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="amount">Monto *</Label>
                                  <Input
                                    id="amount"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="reference">Referencia</Label>
                                  <Input id="reference" placeholder="Referencia" value={reference} onChange={(e) => setReference(e.target.value)} />
                                </div>
                              </div>

                              <div className="space-y-2 mt-3">
                                <Label htmlFor="paymentNotes">Notas</Label>
                                <Textarea id="paymentNotes" placeholder="Observaciones..." value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={3} />
                              </div>

                                {selectedAction === "pago" && (
                                  <div className="space-y-3 mt-3">
                                    <div>
                                      <Label htmlFor="invoice">Factura (PDF/Imagen)</Label>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          id="invoice"
                                          type="file"
                                          accept="image/*,application/pdf"
                                          onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                                          className="flex-1"
                                        />
                                        {invoiceFile && (
                                          <Button type="button" variant="ghost" size="sm" onClick={() => setInvoiceFile(null)}>
                                            Quitar
                                          </Button>
                                        )}
                                      </div>
                                      {invoiceFile && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                          <FileText className="h-3 w-3" />
                                          {invoiceFile.name}
                                        </p>
                                      )}
                                    </div>

                                    <div>
                                      <Label htmlFor="receipt">Comprobante (PDF/Imagen)</Label>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          id="receipt"
                                          type="file"
                                          accept="image/*,application/pdf"
                                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                          className="flex-1"
                                        />
                                        {receiptFile && (
                                          <Button type="button" variant="ghost" size="sm" onClick={() => setReceiptFile(null)}>
                                            Quitar
                                          </Button>
                                        )}
                                      </div>
                                      {receiptFile && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                          <FileText className="h-3 w-3" />
                                          {receiptFile.name}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                              <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => { setIsPaymentDialogOpen(false); setSelectedAction(null); }}>
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={async () => {
                                    if (!amount || parseAmountToNumber(amount) <= 0) return

                                    try {
                                      if (selectedAction === "pago") {
                                        await handleSavePayment()
                                        return
                                      }

                                      // For 'abono' and 'devolucion' create account movements via API
                                      const typePayload = selectedAction === "abono" ? "abono" : "cargo"
                                      // Map Spanish UI payment methods to API values
                                      const methodMap: Record<string, string> = {
                                        efectivo: "cash",
                                        transferencia: "transfer",
                                        cheque: "check",
                                        deposito: "other",
                                      }

                                      const payload: any = {
                                        producerId: selectedProducer,
                                        amount: parseAmountToNumber(amount),
                                        // Map to API enum; fallback to 'other' if unknown
                                        method: paymentMethod ? methodMap[paymentMethod] || "other" : undefined,
                                        reference,
                                        notes: paymentNotes,
                                        type: typePayload,
                                      }

                                      await apiCreatePayment(payload)
                                      await mutateAccount()

                                      // Reset form
                                      setAmount("")
                                      setReference("")
                                      setPaymentNotes("")
                                      setInvoiceFile(null)
                                      setReceiptFile(null)
                                      setSelectedAction(null)
                                      setIsPaymentDialogOpen(false)
                                    } catch (err) {
                                      console.error("Failed saving movement", err)
                                      alert("Error al guardar movimiento: " + (err as any)?.message || err)
                                    }
                                  }}
                                  disabled={!amount || parseAmountToNumber(amount) <= 0}
                                >
                                  Guardar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">Selecciona una tarjeta arriba para iniciar el registro.</div>
                          )}
                        </div>
                      </DialogContent>
                  </Dialog>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedProducer && producer && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Actual</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span
                    className={
                      producer.accountBalance > 0 ? "text-green-600" : producer.accountBalance < 0 ? "text-red-600" : ""
                    }
                  >
                    {safeCurrency(producer.accountBalance)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {producer.accountBalance > 0
                    ? "A favor del productor"
                    : producer.accountBalance < 0
                      ? "En contra del productor"
                      : "Cuenta saldada"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Asignado</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{safeCurrency(totalAssigned)}</div>
                <p className="text-xs text-muted-foreground mt-1">Insumos entregados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Recibido</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{safeCurrency(totalReceived)}</div>
                <p className="text-xs text-muted-foreground mt-1">Fruta entregada y vendida</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{safeCurrency(totalPaid)}</div>
                <p className="text-xs text-muted-foreground mt-1">Pagos realizados</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Movimientos de Cuenta</CardTitle>
              <CardDescription>Historial completo de movimientos del productor</CardDescription>
            </CardHeader>
            <CardContent>
              {mappedMovements.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappedMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="text-sm">{formatDate(movement.date)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                movement.type === "pago" ? "secondary" : movement.amount > 0 ? "default" : "outline"
                              }
                            >
                              {movement.type === "asignacion"
                                ? "Asignación"
                                : movement.type === "venta"
                                  ? "Venta"
                                  : "Pago"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-sm">{movement.description}</div>
                          </TableCell>
                          <TableCell className="text-sm font-mono">{movement.referenceNumber}</TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                movement.amount > 0 ? "font-semibold text-green-600" : "font-semibold text-red-600"
                              }
                            >
                              {movement.amount > 0 ? "+" : ""}
                              {safeCurrency(movement.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                movement.balance > 0
                                  ? "font-semibold text-green-600"
                                  : movement.balance < 0
                                    ? "font-semibold text-red-600"
                                    : "font-semibold"
                              }
                            >
                              {safeCurrency(movement.balance)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No hay movimientos registrados para este productor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
