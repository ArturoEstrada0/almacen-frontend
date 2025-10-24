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
import { mockProducers, mockProducerPayments } from "@/lib/mock-data"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import type { PaymentMethod } from "@/lib/types"

export function AccountStatementsTab() {
  const [selectedProducer, setSelectedProducer] = useState<string>("")
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

  // Payment form state
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transferencia")
  const [reference, setReference] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)

  const producer = mockProducers.find((p) => p.id === selectedProducer)
  const payments = mockProducerPayments.filter((p) => p.producerId === selectedProducer)

  // Mock account movements - in real app, fetch from API
  const mockMovements =
    selectedProducer === "prod-1"
      ? [
          {
            id: "1",
            date: new Date("2024-11-15"),
            type: "asignacion",
            description: "Asignación de insumos ASG-2024-001",
            referenceNumber: "ASG-2024-001",
            amount: -17400,
            balance: -17400,
          },
          {
            id: "2",
            date: new Date("2024-12-15"),
            type: "venta",
            description: "Venta embarque EMB-2024-001 - 500 cajas a $65/caja",
            referenceNumber: "EMB-2024-001",
            amount: 32500,
            balance: 15100,
          },
          {
            id: "3",
            date: new Date("2024-12-16"),
            type: "pago",
            description: "Pago parcial PAG-2024-001 - Transferencia",
            referenceNumber: "PAG-2024-001",
            amount: -15000,
            balance: 100,
          },
          {
            id: "4",
            date: new Date("2024-12-20"),
            type: "venta",
            description: "Venta embarque EMB-2024-002 - 800 cajas a $50/caja",
            referenceNumber: "EMB-2024-002",
            amount: 40000,
            balance: 40100,
          },
        ]
      : []

  const totalAssigned = mockMovements
    .filter((m) => m.type === "asignacion")
    .reduce((sum, m) => sum + Math.abs(m.amount), 0)

  const totalReceived = mockMovements.filter((m) => m.type === "venta").reduce((sum, m) => sum + m.amount, 0)

  const totalPaid = mockMovements.filter((m) => m.type === "pago").reduce((sum, m) => sum + Math.abs(m.amount), 0)

  const handleSavePayment = () => {
    console.log("[v0] Saving payment:", {
      producerId: selectedProducer,
      paymentDate,
      amount: Number(amount),
      paymentMethod,
      reference,
      evidenceFile: evidenceFile?.name,
      notes: paymentNotes,
    })
    // Reset form
    setPaymentDate(new Date().toISOString().split("T")[0])
    setAmount("")
    setPaymentMethod("transferencia")
    setReference("")
    setPaymentNotes("")
    setEvidenceFile(null)
    setIsPaymentDialogOpen(false)
  }

  const handleExport = () => {
    console.log("[v0] Exporting account statement for producer:", selectedProducer)
    // In real app, generate PDF or Excel
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
                    {mockProducers.map((producer) => (
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
                                {formatCurrency(Math.abs(producer?.accountBalance || 0))}
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
                            <Label htmlFor="paymentDate">Fecha de Pago *</Label>
                            <Input
                              id="paymentDate"
                              type="date"
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                            />
                          </div>
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
                    {formatCurrency(Math.abs(producer.accountBalance))}
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
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalAssigned)}</div>
                <p className="text-xs text-muted-foreground mt-1">Insumos entregados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Recibido</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</div>
                <p className="text-xs text-muted-foreground mt-1">Fruta entregada y vendida</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalPaid)}</div>
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
              {mockMovements.length > 0 ? (
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
                      {mockMovements.map((movement) => (
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
                              {formatCurrency(movement.amount)}
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
                              {formatCurrency(movement.balance)}
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
