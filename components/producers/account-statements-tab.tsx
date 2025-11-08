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

export function AccountStatementsTab() {
  const [selectedProducer, setSelectedProducer] = useState<string>("")
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

  // Payment form state
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transferencia")
  const [reference, setReference] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)

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
    amount: Number(m.amount),
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
          amount: Number(amount),
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
        setEvidenceFile(null)
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
                        Registrar Pago
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                      <DialogHeader>
                        <DialogTitle>Registrar Pago</DialogTitle>
                        <DialogDescription>Registra un pago realizado al productor {producer?.name}</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                          <div className="flex items-start gap-2">
                            <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-blue-900">Saldo Actual</p>
                              <p className="text-lg font-bold text-blue-900">
                                {safeCurrency(producer?.accountBalance)}
                              </p>
                              <p className="text-xs text-blue-700">
                                {(producer?.accountBalance || 0) > 0
                                  ? "A favor del productor (le debemos)"
                                  : "En contra del productor (nos debe)"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="amount">Monto *</Label>
                            <Input
                              id="amount"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="method">Método de Pago *</Label>
                            <Select
                              value={paymentMethod}
                              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="efectivo">Efectivo</SelectItem>
                                <SelectItem value="transferencia">Transferencia</SelectItem>
                                <SelectItem value="cheque">Cheque</SelectItem>
                                <SelectItem value="deposito">Depósito</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reference">Referencia</Label>
                          <Input
                            id="reference"
                            placeholder="Número de cheque, transferencia, etc."
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="evidence">Evidencia (Comprobante)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="evidence"
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                              className="flex-1"
                            />
                            {evidenceFile && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => setEvidenceFile(null)}>
                                Quitar
                              </Button>
                            )}
                          </div>
                          {evidenceFile && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {evidenceFile.name}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="paymentNotes">Notas</Label>
                          <Textarea
                            id="paymentNotes"
                            placeholder="Observaciones adicionales..."
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleSavePayment} disabled={!amount || Number(amount) <= 0}>
                          Guardar Pago
                        </Button>
                      </DialogFooter>
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
