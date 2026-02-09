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
import { ComboBox } from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { Plus, Download, DollarSign, TrendingUp, TrendingDown, FileText } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import type { PaymentMethod } from "@/lib/types"
import { useProducers, useProducerAccountStatement, createPayment as apiCreatePayment, getProducerReport } from "@/lib/hooks/use-producers"
import { TablePagination, usePagination } from "@/components/ui/table-pagination"

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
  
  // Nueva funcionalidad: selección de movimientos y abono
  const [selectedMovements, setSelectedMovements] = useState<string[]>([])
  const [hasRetention, setHasRetention] = useState(false)
  const [retentionAmount, setRetentionAmount] = useState("")
  const [retentionNotes, setRetentionNotes] = useState("")
  const [retentionPaymentFile, setRetentionPaymentFile] = useState<File | null>(null)

  const { producers } = useProducers()
  const { accountStatement, mutate: mutateAccount } = useProducerAccountStatement(selectedProducer)
  const producer = (producers || []).find((p) => p.id === selectedProducer)

  const movementsRaw: any[] = (accountStatement && (accountStatement as any).movements) || []

  // Map backend movement shape to UI-friendly shape
  const mappedMovements: any[] = movementsRaw.map((m: any) => {
    // Determinar subtipo basado en descripción
    let subtype = m.type
    if (m.type === "cargo") {
      // Diferenciar entre asignación y abono
      if (m.description?.includes("Abono")) {
        subtype = "retencion"
      } else {
        subtype = "asignacion"
      }
    } else if (m.type === "abono") {
      if (m.description?.includes("Venta de embarque")) {
        subtype = "venta"
      } else if (m.description?.includes("Devolución de material")) {
        subtype = "devolucion"
      } else {
        subtype = "abono"
      }
    } else if (m.type === "pago") {
      subtype = "pago"
    }

    // Determinar el signo del monto según el subtipo
    // Desde la perspectiva del saldo (lo que le debemos al productor):
    // - Asignación (cargo): negativo - él nos debe, reduce el saldo
    // - Abono/Retención (cargo): positivo - es un crédito a favor del productor
    // - Devolución (abono): positivo - nos devuelve, aumenta lo que le debemos o reduce lo que nos debe
    // - Venta (abono): positivo - le debemos más por su fruta
    // - Pago: negativo - pagamos, reduce lo que le debemos
    let amount = Number(m.amount)
    if (subtype === "asignacion" || subtype === "pago") {
      amount = -Math.abs(amount)
    } else {
      // venta, devolucion, retencion (abono)
      amount = Math.abs(amount)
    }

    return {
      id: m.id,
      date: m.createdAt ? new Date(m.createdAt) : m.date ? new Date(m.date) : new Date(),
      type: subtype,
      description: m.description,
      referenceNumber: m.referenceCode || m.reference_code || m.referenceNumber || "",
      amount: amount,
      balance: Number(m.balance),
    }
  }).sort((a, b) => b.date.getTime() - a.date.getTime()) // Orden descendente: más recientes primero

  // Pagination for movements
  const { pagedItems: pagedMovements, paginationProps: movementsPaginationProps } = usePagination(mappedMovements, 20)

  const totalAssigned = mappedMovements
    .filter((m) => m.type === "asignacion")
    .reduce((sum, m) => sum + Math.abs(m.amount), 0)

  const totalReceived = mappedMovements.filter((m) => m.type === "venta").reduce((sum, m) => sum + m.amount, 0)

  const totalReturned = mappedMovements.filter((m) => m.type === "devolucion").reduce((sum, m) => sum + Math.abs(m.amount), 0)

  const totalPaid = mappedMovements.filter((m) => m.type === "pago").reduce((sum, m) => sum + Math.abs(m.amount), 0)

  // Calcular el total automáticamente basado en movimientos seleccionados
  const calculateTotalFromSelectedMovements = () => {
    if (selectedMovements.length === 0) return 0
    return mappedMovements
      .filter(m => selectedMovements.includes(m.id) && m.type === "venta")
      .reduce((sum, m) => sum + Math.abs(m.amount), 0)
  }

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
        
        // Si hay movimientos seleccionados, usar el total calculado
        const finalAmount = selectedMovements.length > 0 
          ? calculateTotalFromSelectedMovements() 
          : parseAmountToNumber(amount)
        const retention = hasRetention ? parseAmountToNumber(retentionAmount) : 0
        
        const payload = {
          producerId: selectedProducer,
          amount: finalAmount,
          method: methodMap[paymentMethod] || "other",
          reference,
          notes: paymentNotes,
          selectedMovements: selectedMovements.length > 0 ? selectedMovements : undefined,
          retention: retention > 0 ? {
            amount: retention,
            notes: retentionNotes
          } : undefined
        }
        
        await apiCreatePayment(payload)
        // Refresh account statement and producers list (balance)
        await mutateAccount()
        // Reset form
        setAmount("")
        setPaymentMethod("transferencia")
        setReference("")
        setPaymentNotes("")
        setSelectedMovements([])
        setHasRetention(false)
        setRetentionAmount("")
        setRetentionNotes("")
        setRetentionPaymentFile(null)
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

  const handleGenerateReport = async () => {
    if (!selectedProducer) return alert("Selecciona un productor")
    
    try {
      const report = await getProducerReport(selectedProducer)
      
      // Crear un blob con el JSON del reporte
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `reporte_productor_${producer?.code || selectedProducer}_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      // También podríamos abrir una ventana de impresión con el reporte formateado
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(generatePrintableReport(report))
        printWindow.document.close()
        printWindow.focus()
      }
    } catch (error) {
      console.error("Error al generar reporte:", error)
      alert("Error al generar el reporte")
    }
  }

  const generatePrintableReport = (report: any) => {
    const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val)
    const formatDate = (date: string) => new Date(date).toLocaleDateString('es-MX')
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte del Productor - ${report.producer.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 12px;
          }
          h1 { font-size: 20px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #333; }
          h3 { font-size: 14px; margin-top: 15px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
          .summary-item { border: 1px solid #ddd; padding: 10px; border-radius: 4px; }
          .summary-item .label { font-size: 11px; color: #666; }
          .summary-item .value { font-size: 18px; font-weight: bold; margin-top: 5px; }
          .positive { color: #16a34a; }
          .negative { color: #dc2626; }
          .text-right { text-align: right; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 3px solid #333; padding-bottom: 10px; }
          .no-print { display: none; }
          @media print {
            .no-print { display: none !important; }
            body { margin: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Reporte del Productor</h1>
            <p><strong>Código:</strong> ${report.producer.code}</p>
            <p><strong>Nombre:</strong> ${report.producer.name}</p>
            ${report.producer.rfc ? `<p><strong>RFC:</strong> ${report.producer.rfc}</p>` : ''}
          </div>
          <div style="text-align: right;">
            <p><strong>Fecha de Generación:</strong></p>
            <p>${formatDate(report.generatedAt)}</p>
          </div>
        </div>

        <h2>Resumen General</h2>
        <div class="summary">
          <div class="summary-item">
            <div class="label">Total Asignado (Insumos)</div>
            <div class="value negative">-${formatCurrency(report.summary.totalAssigned)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Total Ventas</div>
            <div class="value positive">+${formatCurrency(report.summary.totalSales)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Total Pagado</div>
            <div class="value negative">-${formatCurrency(report.summary.totalPaid)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Cajas Recibidas</div>
            <div class="value">${report.summary.totalBoxesReceived.toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="label">Cajas Embarcadas</div>
            <div class="value">${report.summary.totalBoxesShipped.toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="label">Saldo Actual</div>
            <div class="value ${report.summary.currentBalance >= 0 ? 'positive' : 'negative'}">
              ${formatCurrency(report.summary.currentBalance)}
            </div>
          </div>
        </div>

        <h2>Asignaciones de Insumos</h2>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Almacén</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${report.inputAssignments.map((a: any) => `
              <tr>
                <td>${a.code}</td>
                <td>${a.trackingFolio || '-'}</td>
                <td>${formatDate(a.date)}</td>
                <td>${a.warehouse || '-'}</td>
                <td class="text-right">${formatCurrency(a.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Recepciones de Fruta</h2>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Producto</th>
              <th class="text-right">Cajas</th>
              <th>Estado</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${report.fruitReceptions.map((r: any) => `
              <tr>
                <td>${r.code}</td>
                <td>${r.trackingFolio || '-'}</td>
                <td>${formatDate(r.date)}</td>
                <td>${r.product}</td>
                <td class="text-right">${r.boxes}</td>
                <td>${r.shipmentStatus}</td>
                <td class="text-right">${r.finalTotal ? formatCurrency(r.finalTotal) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Embarques</h2>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Fecha</th>
              <th class="text-right">Total Cajas</th>
              <th>Estado</th>
              <th class="text-right">Precio/Caja</th>
              <th class="text-right">Total Venta</th>
            </tr>
          </thead>
          <tbody>
            ${report.shipments.map((s: any) => `
              <tr>
                <td>${s.code}</td>
                <td>${formatDate(s.date)}</td>
                <td class="text-right">${s.totalBoxes}</td>
                <td>${s.status}</td>
                <td class="text-right">${s.salePricePerBox ? formatCurrency(s.salePricePerBox) : '-'}</td>
                <td class="text-right">${s.totalSale ? formatCurrency(s.totalSale) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Movimientos de Cuenta</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Referencia</th>
              <th class="text-right">Monto</th>
              <th class="text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            ${report.accountMovements.map((m: any) => `
              <tr>
                <td>${m.date ? formatDate(m.date) : '-'}</td>
                <td>${m.type}</td>
                <td>${m.description || '-'}</td>
                <td>${m.referenceCode || '-'}</td>
                <td class="text-right ${m.amount >= 0 ? 'positive' : 'negative'}">
                  ${formatCurrency(m.amount)}
                </td>
                <td class="text-right ${m.balance >= 0 ? 'positive' : 'negative'}">
                  ${formatCurrency(m.balance)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 40px; page-break-inside: avoid;">
          <p style="font-size: 10px; color: #666;">
            Reporte generado automáticamente el ${formatDate(report.generatedAt)}
          </p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `
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
                <ComboBox
                  value={selectedProducer}
                  onChange={setSelectedProducer}
                  options={(producers || []).map((producer) => ({
                    value: producer.id,
                    label: `${producer.code} - ${producer.name}`,
                    subtitle: producer.code
                  }))}
                  placeholder="Seleccionar productor"
                  searchPlaceholder="Buscar productor..."
                  emptyMessage="No se encontró el productor"
                />
              </div>
              {selectedProducer && (
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={handleGenerateReport}>
                    <FileText className="mr-2 h-4 w-4" />
                    Generar Reporte
                  </Button>
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
                                    value={selectedAction === "pago" && selectedMovements.length > 0 
                                      ? formatCurrency(calculateTotalFromSelectedMovements())
                                      : amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    disabled={selectedAction === "pago" && selectedMovements.length > 0}
                                    className={selectedAction === "pago" && selectedMovements.length > 0 ? "bg-muted" : ""}
                                  />
                                  {selectedAction === "pago" && selectedMovements.length > 0 && (
                                    <p className="text-xs text-muted-foreground">Calculado automáticamente desde los movimientos seleccionados</p>
                                  )}
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
                                  <>
                                    {/* Sección de selección de movimientos */}
                                    <div className="space-y-3 mt-4 border-t pt-4">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold">Ventas a Pagar</Label>
                                        <span className="text-xs text-muted-foreground">
                                          {selectedMovements.length} seleccionadas
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        Selecciona las ventas que este pago está cubriendo. El monto se calculará automáticamente.
                                      </p>
                                      
                                      <div className="max-h-48 overflow-y-auto border rounded-md">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-12"></TableHead>
                                              <TableHead>Fecha</TableHead>
                                              <TableHead>Referencia</TableHead>
                                              <TableHead>Descripción</TableHead>
                                              <TableHead className="text-right">Monto</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {mappedMovements.filter(m => m.type === "venta").map((mov) => (
                                              <TableRow key={mov.id}>
                                                <TableCell>
                                                  <input
                                                    type="checkbox"
                                                    checked={selectedMovements.includes(mov.id)}
                                                    onChange={(e) => {
                                                      if (e.target.checked) {
                                                        setSelectedMovements([...selectedMovements, mov.id])
                                                      } else {
                                                        setSelectedMovements(selectedMovements.filter(id => id !== mov.id))
                                                      }
                                                    }}
                                                    className="h-4 w-4"
                                                  />
                                                </TableCell>
                                                <TableCell className="text-xs">{formatDate(mov.date)}</TableCell>
                                                <TableCell className="text-xs font-mono">{mov.referenceNumber || "-"}</TableCell>
                                                <TableCell className="text-xs">{mov.description}</TableCell>
                                                <TableCell className="text-right text-xs font-semibold text-green-600">{safeCurrency(mov.amount)}</TableCell>
                                              </TableRow>
                                            ))}
                                            {mappedMovements.filter(m => m.type === "venta").length === 0 && (
                                              <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                                                  No hay ventas pendientes de pago
                                                </TableCell>
                                              </TableRow>
                                            )}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>

                                    {/* Sección de abono */}
                                    <div className="space-y-3 mt-4 border-t pt-4">
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id="hasRetention"
                                          checked={hasRetention}
                                          onChange={(e) => {
                                            setHasRetention(e.target.checked)
                                            if (!e.target.checked) {
                                              setRetentionAmount("")
                                              setRetentionNotes("")
                                              setRetentionPaymentFile(null)
                                            }
                                          }}
                                          className="h-4 w-4"
                                        />
                                        <Label htmlFor="hasRetention" className="text-base font-semibold cursor-pointer">
                                          Aplicar Abono
                                        </Label>
                                      </div>
                                      
                                      {hasRetention && (
                                        <div className="space-y-3 ml-6 p-3 bg-amber-50 border border-amber-200 rounded-md">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <Label htmlFor="retentionAmount">Monto de Abono *</Label>
                                              <Input
                                                id="retentionAmount"
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0.00"
                                                value={retentionAmount}
                                                onChange={(e) => setRetentionAmount(e.target.value)}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label className="text-sm text-muted-foreground">Monto Neto</Label>
                                              <div className="h-10 px-3 py-2 border rounded-md bg-white flex items-center font-semibold text-green-600">
                                                {safeCurrency((selectedMovements.length > 0 ? calculateTotalFromSelectedMovements() : parseAmountToNumber(amount)) - parseAmountToNumber(retentionAmount))}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="space-y-2 col-span-2">
                                            <Label htmlFor="retentionNotes">Motivo del Abono</Label>
                                            <Textarea
                                              id="retentionNotes"
                                              placeholder="Ej: Abono por descuento, ajuste, etc." 
                                              value={retentionNotes}
                                              onChange={(e) => setRetentionNotes(e.target.value)}
                                              rows={2}
                                            />
                                          </div>
                                          <div className="space-y-2 col-span-2">
                                            <Label htmlFor="retentionPaymentFile">Complemento de Pago (PDF)</Label>
                                            <div className="flex items-center gap-2">
                                              <Input
                                                id="retentionPaymentFile"
                                                type="file"
                                                accept="application/pdf"
                                                onChange={(e) => setRetentionPaymentFile(e.target.files?.[0] || null)}
                                                className="flex-1"
                                              />
                                              {retentionPaymentFile && (
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setRetentionPaymentFile(null)}>
                                                  Quitar
                                                </Button>
                                              )}
                                            </div>
                                            {retentionPaymentFile && (
                                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                <FileText className="h-3 w-3" />
                                                {retentionPaymentFile.name}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}

                              <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => { setIsPaymentDialogOpen(false); setSelectedAction(null); }}>
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={async () => {
                                    const finalAmount = selectedAction === "pago" && selectedMovements.length > 0 
                                      ? calculateTotalFromSelectedMovements() 
                                      : parseAmountToNumber(amount)
                                    
                                    if (finalAmount <= 0) return

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
                                      setSelectedAction(null)
                                      setIsPaymentDialogOpen(false)
                                    } catch (err) {
                                      console.error("Failed saving movement", err)
                                      alert("Error al guardar movimiento: " + (err as any)?.message || err)
                                    }
                                  }}
                                  disabled={
                                    selectedAction === "pago" && selectedMovements.length > 0 
                                      ? selectedMovements.length === 0 || calculateTotalFromSelectedMovements() <= 0
                                      : !amount || parseAmountToNumber(amount) <= 0
                                  }
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
          <div className="grid gap-4 md:grid-cols-5">
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
                <CardTitle className="text-sm font-medium">Material Devuelto</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{safeCurrency(totalReturned)}</div>
                <p className="text-xs text-muted-foreground mt-1">Cajas y empaque recuperado</p>
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
                <>
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
                      {pagedMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="text-sm">{formatDate(movement.date)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                movement.type === "venta" 
                                  ? "default" 
                                  : movement.type === "pago" 
                                    ? "secondary"
                                    : movement.type === "retencion"
                                      ? "outline"
                                      : "outline"
                              }
                            >
                              {movement.type === "asignacion"
                                ? "Asignación"
                                : movement.type === "venta"
                                  ? "Venta"
                                  : movement.type === "devolucion"
                                    ? "Devolución"
                                    : movement.type === "pago"
                                      ? "Pago"
                                      : movement.type === "retencion"
                                        ? "Abono"
                                        : movement.type === "abono"
                                          ? "Abono"
                                          : movement.type}
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
                <TablePagination {...movementsPaginationProps} />
                </>
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
