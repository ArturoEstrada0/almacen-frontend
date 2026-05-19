"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { uploadFileToSupabase } from "@/lib/services/file-upload"
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
import { ProductorComboBox } from "@/components/ui/productor-combobox"
import { Label } from "@/components/ui/label"
import { Plus, Download, DollarSign, TrendingUp, TrendingDown, FileText, ChevronsUpDown, ArrowUp, ArrowDown, Eye, Trash2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import type { PaymentMethod } from "@/lib/types"
import { useProducers, useProducerAccountStatement, createPayment as apiCreatePayment, getProducerReport } from "@/lib/hooks/use-producers"
import { TablePagination, usePagination } from "@/components/ui/table-pagination"
import Spinner2 from "@/components/ui/spinner2"
import { jsPDF } from "jspdf"

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
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [sortBy, setSortBy] = useState<"date" | "type" | "amount" | "reference">("date")
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
  const [retentionPaymentUrl, setRetentionPaymentUrl] = useState("")
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [movementInvoiceFile, setMovementInvoiceFile] = useState<File | null>(null)
  const [movementInvoiceUrl, setMovementInvoiceUrl] = useState("")
  const [isAmountEdited, setIsAmountEdited] = useState(false)

  // Modal para detalles de movimiento
  const [isMovementDetailsOpen, setIsMovementDetailsOpen] = useState(false)
  const [selectedMovementDetails, setSelectedMovementDetails] = useState<any | null>(null)

  // Search states
  const [movementSearchTerm, setMovementSearchTerm] = useState("")
  const [shipmentSearchTerm, setShipmentSearchTerm] = useState("")

  const { producers } = useProducers()
  const { accountStatement, mutate: mutateAccount, isLoading: accountLoading } = useProducerAccountStatement(selectedProducer)
  const producer = (producers || []).find((p) => p.id === selectedProducer)

  const movementsRaw: any[] = (accountStatement && (accountStatement as any).movements) || []

  // Map backend movement shape to UI-friendly shape
  const mappedMovements: any[] = movementsRaw.map((m: any) => {
    // Determinar subtipo basado en descripción
    let subtype = m.type
    if (m.type === "cargo") {
      // Diferenciar entre asignación y retencion (descuento)
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
    // Salidas (negativo, rojo): Asignación, Pago, Retención (descuento)
    // Entradas (positivo, verde): Venta, Devolución, Abono
    let amount = Number(m.amount)
    if (subtype === "asignacion" || subtype === "pago" || subtype === "retencion") {
      amount = -Math.abs(amount)
    } else {
      // venta, devolucion, abono (entradas)
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
      evidenceUrl: m.evidenceUrl || m.evidence_url || "",
      paymentStatus: m.paymentStatus || m.payment_status || "pendiente",
    }
  }).sort((a, b) => {
    switch (sortBy) {
      case 'type': {
        const av = (a.type || "").toString().toLowerCase()
        const bv = (b.type || "").toString().toLowerCase()
        return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      case 'amount': {
        const an = Number(a.amount || 0)
        const bn = Number(b.amount || 0)
        return sortOrder === 'asc' ? an - bn : bn - an
      }
      case 'reference': {
        const av = (a.referenceNumber || "").toString().toLowerCase()
        const bv = (b.referenceNumber || "").toString().toLowerCase()
        return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      case 'date':
      default:
        return sortOrder === 'asc' ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()
    }
  }) // Orden dinámico según selección

  // Filtro de búsqueda para movimientos
  const filteredMovements = mappedMovements.filter((movement) => {
    const searchLower = movementSearchTerm.toLowerCase()
    const dateStr = movement.date instanceof Date
      ? movement.date.toLocaleDateString('es-ES')
      : String(movement.date)
    return (
      dateStr.toLowerCase().includes(searchLower) ||
      movement.referenceNumber.toLowerCase().includes(searchLower) ||
      movement.description.toLowerCase().includes(searchLower) ||
      movement.type.toLowerCase().includes(searchLower) ||
      movement.paymentStatus.toLowerCase().includes(searchLower) ||
      safeCurrency(movement.amount).toLowerCase().includes(searchLower) ||
      safeCurrency(movement.balance).toLowerCase().includes(searchLower)
    )
  })

  // Pagination for movements
  const { pagedItems: pagedMovements, paginationProps: movementsPaginationProps } = usePagination(filteredMovements, 20)

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
    ; (async () => {
      try {
        // Validación: productor seleccionado
        if (!selectedProducer) {
          return alert("Por favor selecciona un productor")
        }

        // Traducir método de pago a inglés
        const methodMap: Record<string, string> = {
          efectivo: "cash",
          transferencia: "transfer",
          cheque: "check",
          deposito: "other",
        }

        // Si hay movimientos seleccionados, usar el monto editado si existe, si no usar el calculado
        const finalAmount = parseAmountToNumber(amount) || (selectedMovements.length > 0 ? calculateTotalFromSelectedMovements() : 0)
        const retention = hasRetention ? parseAmountToNumber(retentionAmount) : 0

        // Validación: monto
        if (finalAmount <= 0) {
          return alert("El monto debe ser mayor a 0")
        }

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
          } : undefined,
          evidenceUrl: retentionPaymentUrl || undefined
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
        setIsAmountEdited(false)
        setIsPaymentDialogOpen(false)
      } catch (err) {
        console.error("Failed saving payment - Full error:", err)
        const error = err as any
        let errorMessage = error?.message || "Error desconocido"

        // Log completo del error para debugging
        console.log("Error details:", {
          message: error?.message,
          statusCode: error?.statusCode,
          status: error?.status,
          technicalDetails: error?.technicalDetails,
          errors: error?.errors,
          raw: error?.raw,
        })

        // Si hay detalles técnicos disponibles, incluirlos para debugging
        if (error?.technicalDetails) {
          errorMessage += ` (Detalles técnicos: ${error.technicalDetails})`
        }

        // Mostrar status code si está disponible
        if (error?.statusCode || error?.status) {
          errorMessage += ` (Status: ${error?.statusCode || error?.status})`
        }

        // Si hay errores de validación, incluirlos
        if (error?.errors && Array.isArray(error.errors)) {
          const validationErrors = error.errors
            .map((e: any) => e.property ? `${e.property}: ${Object.values(e.constraints || {}).join(', ')}` : String(e))
            .join('; ')
          if (validationErrors) {
            errorMessage += ` (Validación: ${validationErrors})`
          }
        }

        alert("Error al guardar pago: " + errorMessage)
      }
    })()
  }


  const handleGenerateReport = async () => {
    if (!selectedProducer) return alert("Selecciona un productor")

    try {
      const report = await getProducerReport(selectedProducer)
      const htmlContent = generatePrintableReport(report)

      // Crear blob y abrir en nueva ventana para vista previa
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const blobUrl = URL.createObjectURL(blob)
      const newWindow = window.open(blobUrl, '_blank')

      if (!newWindow) {
        alert("No se pudo abrir la vista previa. Intenta permitir ventanas emergentes.")
      }
    } catch (error) {
      console.error("Error al generar reporte:", error)
      alert("Error al generar el reporte")
    }
  }

  const generatePrintableReport = (report: any) => {
    const localFormatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val)
    const localFormatDate = (date: string) => new Date(date).toLocaleDateString('es-MX')
    const formatDateSystem = () => new Date().toLocaleDateString('es-MX')

    const assignmentsHTML = report.inputAssignments.map((a: any) =>
      `<tr><td>${a.code}</td><td>${a.trackingFolio || '-'}</td><td>${localFormatDate(a.date)}</td><td>${a.warehouse || '-'}</td><td style="text-align: right; color: #dc2626;">${localFormatCurrency(a.total)}</td></tr>`
    ).join('')

    const receptionHTML = report.fruitReceptions.map((r: any) =>
      `<tr><td>${r.code}</td><td>${r.trackingFolio || '-'}</td><td>${localFormatDate(r.date)}</td><td>${r.product}</td><td style="text-align: right;">${r.boxes}</td><td>${r.shipmentStatus}</td><td style="text-align: right; color: #16a34a;">${r.finalTotal ? localFormatCurrency(r.finalTotal) : '-'}</td></tr>`
    ).join('')

    const shipmentsHTML = report.shipments.map((s: any) =>
      `<tr><td>${s.code}</td><td>${localFormatDate(s.date)}</td><td style="text-align: right;">${s.totalBoxes}</td><td>${s.status}</td><td style="text-align: right;">${s.salePricePerBox ? localFormatCurrency(s.salePricePerBox) : '-'}</td><td style="text-align: right; color: #16a34a;">${s.totalSale ? localFormatCurrency(s.totalSale) : '-'}</td></tr>`
    ).join('')

    const movementsHTML = report.accountMovements.map((m: any) => {
      // Determinar subtipo basado en descripción (mismo mapeo que en mappedMovements)
      let subtype = m.type
      if (m.type === "cargo") {
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

      // Aplicar el mismo mapeo de signos
      let amount = Number(m.amount)
      if (subtype === "asignacion" || subtype === "pago" || subtype === "retencion") {
        amount = -Math.abs(amount)
      } else {
        amount = Math.abs(amount)
      }

      // Generar entrada y salida basado en el amount procesado
      const entrada = amount >= 0 ? '+' + localFormatCurrency(amount) : ''
      const salida = amount < 0 ? localFormatCurrency(amount) : ''
      const entradaColor = amount >= 0 ? '#16a34a' : '#999'
      const salidaColor = amount < 0 ? '#dc2626' : '#999'
      const saldoColor = m.balance >= 0 ? '#16a34a' : '#dc2626'
      return `
        <tr>
          <td>${m.date ? localFormatDate(m.date) : '-'}</td>
          <td>${m.type}</td>
          <td>${m.description || '-'}</td>
          <td>${m.referenceCode || '-'}</td>
          <td style="text-align: right; color: ${entradaColor}; font-weight: ${amount >= 0 ? 'bold' : 'normal'};">${entrada}</td>
          <td style="text-align: right; color: ${salidaColor}; font-weight: ${amount < 0 ? 'bold' : 'normal'};">${salida}</td>
          <td style="text-align: right; color: ${saldoColor}; font-weight: bold;">
            ${m.balance >= 0 ? '+' : '-'}${localFormatCurrency(Math.abs(m.balance))}
          </td>
        </tr>
      `
    }).join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte del Productor - ${report.producer.name}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; font-size: 12px; color: #333; }
          h1 { font-size: 20px; margin-bottom: 5px; margin-top: 0; }
          h2 { font-size: 16px; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #333; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #999; padding: 8px; text-align: left; }
          th { background-color: #e0e0e0; font-weight: bold; }
          tbody tr:nth-child(even) { background-color: #f5f5f5; }
          tbody tr:nth-child(odd) { background-color: white; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
          .summary-item { border: 1px solid #ddd; padding: 10px; background: #f9f9f9; }
          .summary-item .label { font-size: 11px; color: #666; margin: 0; }
          .summary-item .value { font-size: 18px; font-weight: bold; margin-top: 5px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 3px solid #333; padding-bottom: 10px; }
          .sticky-header { position: sticky; top: 0; z-index: 1000; background: white; padding: 10px 20px; border-bottom: 1px solid #ddd; display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; width: 100%; box-sizing: border-box; }
.sticky-header-left { font-size: 14px; font-weight: 600; color: #333; flex: 1; }
.sticky-header-right { flex-shrink: 0; }
          .sticky-header-right button { padding: 10px 20px; background: #000; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; }
          .sticky-header-right button:hover { background: #333; }
          .content { padding: 20px; }
          .no-print { display: block; }
          @media print {
            .no-print { display: none !important; }
            .sticky-header { display: none !important; }
            body { margin: 10px; }
            table { page-break-inside: avoid; }
            .content { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="sticky-header no-print">
          <div class="sticky-header-left">Reporte - ${report.producer.code} - ${report.producer.name}</div>
          <div class="sticky-header-right"><button onclick="window.print()">⬇ Descargar como PDF</button></div>
        </div>
        <div class="content">
          <div class="header">
          <div>
            <h1>Reporte del Productor</h1>
            <p style="margin: 5px 0;"><strong>Código:</strong> ${report.producer.code}</p>
            <p style="margin: 5px 0;"><strong>Nombre:</strong> ${report.producer.name}</p>
            ${report.producer.rfc ? `<p style="margin: 5px 0;"><strong>RFC:</strong> ${report.producer.rfc}</p>` : ''}
          </div>
          <div style="text-align: right;">
            <p style="margin: 5px 0;"><strong>Fecha de Generación:</strong></p>
            <p style="margin: 5px 0;">${formatDateSystem()}</p>
          </div>
        </div>

        <h2>Resumen General</h2>
        <div class="summary">
          <div class="summary-item"><p class="label">Total Asignado (Insumos)</p><p class="value" style="color: #dc2626;">-${localFormatCurrency(report.summary.totalAssigned)}</p></div>
          <div class="summary-item"><p class="label">Total Ventas</p><p class="value" style="color: #16a34a;">+${localFormatCurrency(report.summary.totalSales)}</p></div>
          <div class="summary-item"><p class="label">Saldo Neto</p><p class="value" style="color: ${(report.summary.totalAssigned - (report.summary.totalReturned || 0)) > 0 ? '#dc2626' : '#16a34a'};">${localFormatCurrency(report.summary.totalAssigned - (report.summary.totalReturned || 0))}</p></div>
          <div class="summary-item"><p class="label">Total Pagado</p><p class="value" style="color: #dc2626;">-${localFormatCurrency(report.summary.totalPaid)}</p></div>
          <div class="summary-item"><p class="label">Saldo Actual</p><p class="value" style="color: ${report.summary.currentBalance >= 0 ? '#16a34a' : '#dc2626'};">${localFormatCurrency(report.summary.currentBalance)}</p></div>
          <div class="summary-item"><p class="label">Cajas Recibidas</p><p class="value" style="color: #333;">${report.summary.totalBoxesReceived.toLocaleString()}</p></div>
        </div>

        <h2>Asignaciones de Insumos</h2>
        <table><thead><tr><th>Código</th><th>Folio</th><th>Fecha</th><th>Almacén</th><th style="text-align: right;">Total</th></tr></thead><tbody>${assignmentsHTML}</tbody></table>

        <h2>Recepciones de Fruta</h2>
        <table><thead><tr><th>Código</th><th>Folio</th><th>Fecha</th><th>Producto</th><th style="text-align: right;">Cajas</th><th>Estado</th><th style="text-align: right;">Total</th></tr></thead><tbody>${receptionHTML}</tbody></table>

        <h2>Embarques</h2>
        <table><thead><tr><th>Código</th><th>Fecha</th><th style="text-align: right;">Total Cajas</th><th>Estado</th><th style="text-align: right;">Precio/Caja</th><th style="text-align: right;">Total Venta</th></tr></thead><tbody>${shipmentsHTML}</tbody></table>

        <h2>Movimientos de Cuenta</h2>
        <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Referencia</th><th style="text-align: right;">Entrada (+)</th><th style="text-align: right;">Salida (-)</th><th style="text-align: right;">Saldo</th></tr></thead><tbody>${movementsHTML}</tbody></table>

        <div style="margin-top: 40px; page-break-inside: avoid;"><p style="font-size: 10px; color: #666;">Reporte generado automáticamente el ${formatDateSystem()}</p></div>
        </div>
      </body>
      </html>
    `
  }

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('es-MX')
    } catch {
      return date || '-'
    }
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
                <ProductorComboBox
                  value={selectedProducer}
                  onChange={setSelectedProducer}
                  options={(producers || []).map((producer) => ({
                    value: String(producer.id),
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
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Ordenar por..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Fecha</SelectItem>
                      <SelectItem value="type">Tipo</SelectItem>
                      <SelectItem value="amount">Monto</SelectItem>
                      <SelectItem value="reference">Referencia</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')} title="Ordenar A–Z / Z–A">
                    <ChevronsUpDown className="mr-2 h-4 w-4" />
                    {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </Button>
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
                    <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
                      <DialogHeader className="sticky top-0 bg-white z-10 border-b px-6 py-4">
                        <DialogTitle>Registrar Movimiento</DialogTitle>
                        <DialogDescription>Selecciona el tipo de movimiento que quieres registrar para {producer?.name}</DialogDescription>
                      </DialogHeader>
                      <div className="overflow-y-auto flex-1 px-6">
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
                                    onChange={(e) => {
                                      setAmount(e.target.value)
                                      setIsAmountEdited(true)
                                    }}
                                    className=""
                                  />
                                  {selectedAction === "pago" && selectedMovements.length > 0 && !isAmountEdited && (
                                    <p className="text-xs text-muted-foreground">Total sugerido: {formatCurrency(calculateTotalFromSelectedMovements())} (editable)</p>
                                  )}
                                  {selectedAction === "pago" && selectedMovements.length > 0 && isAmountEdited && (
                                    <p className="text-xs text-blue-600">Monto personalizado. Total sugerido: {formatCurrency(calculateTotalFromSelectedMovements())}</p>
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

                              {selectedAction !== "pago" && selectedAction && (
                                <div className="space-y-2 mt-3">
                                  <Label htmlFor="movementInvoice">Archivo Adjunto (Factura/Comprobante)</Label>
                                  {!movementInvoiceFile ? (
                                    <div className="border-2 border-dashed rounded-md p-4 bg-muted">
                                      <Input
                                        id="movementInvoice"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0]
                                          if (file) {
                                            setMovementInvoiceFile(file)
                                            setIsUploadingFile(true)
                                            try {
                                              const url = await uploadFileToSupabase(file, "invoices")
                                              setMovementInvoiceUrl(url)
                                            } catch (err) {
                                              alert("Error al subir el archivo: " + (err as any).message)
                                              setMovementInvoiceFile(null)
                                              setMovementInvoiceUrl("")
                                            } finally {
                                              setIsUploadingFile(false)
                                            }
                                          }
                                        }}
                                        disabled={isUploadingFile}
                                        className="cursor-pointer"
                                      />
                                      <p className="text-xs text-muted-foreground mt-2">PDF, JPG o PNG máximo 10MB</p>
                                    </div>
                                  ) : (
                                    <div className="border rounded-md p-3 bg-green-50 border-green-200">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-green-600" />
                                          <span className="text-sm font-medium text-green-700">{movementInvoiceFile.name}</span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setMovementInvoiceFile(null)
                                            setMovementInvoiceUrl("")
                                          }}
                                        >
                                          ✕
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

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

                                    <Input
                                      placeholder="Buscar por fecha, referencia o descripción..."
                                      value={shipmentSearchTerm}
                                      onChange={(e) => setShipmentSearchTerm(e.target.value)}
                                      className="text-sm"
                                    />

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
                                          {mappedMovements.filter(m => {
                                            const isVenta = m.type === "venta"
                                            if (!isVenta) return false
                                            const hasBalance = m.balance > 0
                                            if (!hasBalance) return false
                                            const searchLower = shipmentSearchTerm.toLowerCase()
                                            const dateStr = m.date instanceof Date
                                              ? m.date.toLocaleDateString('es-ES')
                                              : String(m.date)
                                            return (
                                              dateStr.toLowerCase().includes(searchLower) ||
                                              m.referenceNumber.toLowerCase().includes(searchLower) ||
                                              m.description.toLowerCase().includes(searchLower)
                                            )
                                          }).map((mov) => (
                                            <TableRow key={mov.id}>
                                              <TableCell>
                                                <input
                                                  type="checkbox"
                                                  checked={selectedMovements.includes(mov.id)}
                                                  onChange={(e) => {
                                                    if (e.target.checked) {
                                                      setSelectedMovements([...selectedMovements, mov.id])
                                                      setIsAmountEdited(false)
                                                      setAmount("")
                                                    } else {
                                                      setSelectedMovements(selectedMovements.filter(id => id !== mov.id))
                                                      setIsAmountEdited(false)
                                                      setAmount("")
                                                    }
                                                  }}
                                                  className="h-4 w-4"
                                                />
                                              </TableCell>
                                              <TableCell className="text-xs">{formatDate(mov.date)}</TableCell>
                                              <TableCell className="text-xs font-mono">{mov.referenceNumber || "-"}</TableCell>
                                              <TableCell className="text-xs">{mov.description}</TableCell>
                                              <TableCell className="text-right text-xs font-semibold text-green-600">{safeCurrency(Math.abs(mov.amount))}</TableCell>
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
                                          <div className="border rounded-md p-3 bg-gray-50">
                                            {!retentionPaymentFile ? (
                                              <div className="space-y-2">
                                                <p className="text-sm text-muted-foreground">Sin complemento...</p>
                                                <Input
                                                  id="retentionPaymentFile"
                                                  type="file"
                                                  accept="application/pdf"
                                                  onChange={async (e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                      setRetentionPaymentFile(file)
                                                      setIsUploadingFile(true)
                                                      try {
                                                        const url = await uploadFileToSupabase(file, "payment-complements")
                                                        setRetentionPaymentUrl(url)
                                                      } catch (err) {
                                                        alert("Error al subir el archivo: " + (err as any).message)
                                                        setRetentionPaymentFile(null)
                                                      } finally {
                                                        setIsUploadingFile(false)
                                                      }
                                                    }
                                                  }}
                                                  disabled={isUploadingFile}
                                                />
                                              </div>
                                            ) : (
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 flex-1">
                                                  <FileText className="h-4 w-4 text-blue-600" />
                                                  <div className="flex-1">
                                                    <p className="text-sm font-medium truncate">{retentionPaymentFile.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                      {isUploadingFile ? "Subiendo archivo..." : "Archivo cargado"}
                                                    </p>
                                                  </div>
                                                </div>
                                                <div className="flex gap-2">
                                                  <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                      if (retentionPaymentUrl) {
                                                        window.open(retentionPaymentUrl, '_blank')
                                                      }
                                                    }}
                                                    title="Ver documento"
                                                    disabled={isUploadingFile || !retentionPaymentUrl}
                                                  >
                                                    <Eye className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                      setRetentionPaymentFile(null)
                                                      setRetentionPaymentUrl("")
                                                    }}
                                                    disabled={isUploadingFile}
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}

                              <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => {
                                  setIsPaymentDialogOpen(false)
                                  setSelectedAction(null)
                                  setAmount("")
                                  setIsAmountEdited(false)
                                  setSelectedMovements([])
                                }}>
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={async () => {
                                    const finalAmount = parseAmountToNumber(amount) || (selectedAction === "pago" && selectedMovements.length > 0 ? calculateTotalFromSelectedMovements() : 0)

                                    if (finalAmount <= 0) return

                                    try {
                                      if (selectedAction === "pago") {
                                        await handleSavePayment()
                                        return
                                      }

                                      // For 'abono' and 'devolucion' create account movements via API
                                      // Both are "abono" type since they credit the producer
                                      const payload: any = {
                                        producerId: selectedProducer,
                                        amount: parseAmountToNumber(amount),
                                        type: "abono",
                                        movementSubType: selectedAction === "devolucion" ? "devolucion" : undefined,
                                        reference,
                                        notes: paymentNotes,
                                        evidenceUrl: movementInvoiceUrl || undefined,
                                      }

                                      await apiCreatePayment(payload)
                                      await mutateAccount()

                                      // Reset form
                                      setAmount("")
                                      setReference("")
                                      setPaymentNotes("")
                                      setMovementInvoiceFile(null)
                                      setMovementInvoiceUrl("")
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
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedProducer && producer && (
        <>
          <div className="grid gap-4 md:grid-cols-6">
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
                <CardTitle className="text-sm font-medium">Saldo Neto</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {(() => {
                  const netBalance = totalAssigned - totalReturned
                  const isDebt = netBalance > 0
                  return (
                    <>
                      <div className={`text-2xl font-bold ${isDebt ? "text-red-600" : "text-green-600"}`}>
                        {safeCurrency(netBalance)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isDebt ? "Adeudo (a pagar)" : "A favor del productor"}
                      </p>
                    </>
                  )
                })()}
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
              {accountLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Spinner2 />
                </div>
              ) : mappedMovements.length > 0 ? (
                <>
                  <div className="mb-4">
                    <Input
                      placeholder="Buscar por fecha, referencia, descripción, tipo o estado..."
                      value={movementSearchTerm}
                      onChange={(e) => setMovementSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
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
                          <TableHead>Estado</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedMovements.map((movement) => (
                          <TableRow key={movement.id} className="even:bg-gray-100">
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
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  movement.paymentStatus === "pagado"
                                    ? "bg-green-50 text-green-700 border-green-300"
                                    : "text-orange-600 border-orange-600"
                                }
                              >
                                {movement.paymentStatus === "pagado" ? "Pagado" : "Pendiente"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {movement.evidenceUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(movement.evidenceUrl, "_blank")}
                                    title="Ver documento adjunto"
                                  >
                                    <FileText className="h-4 w-4 text-amber-600" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedMovementDetails(movement)
                                    setIsMovementDetailsOpen(true)
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
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

          {/* Modal de detalles del movimiento */}
          <Dialog open={isMovementDetailsOpen} onOpenChange={setIsMovementDetailsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Detalles del Movimiento</DialogTitle>
              </DialogHeader>
              {selectedMovementDetails && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Fecha</Label>
                      <div className="font-medium">{formatDate(selectedMovementDetails.date)}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <div>
                        <Badge variant="outline">
                          {selectedMovementDetails.type === "asignacion"
                            ? "Asignación"
                            : selectedMovementDetails.type === "venta"
                              ? "Venta"
                              : selectedMovementDetails.type === "devolucion"
                                ? "Devolución"
                                : selectedMovementDetails.type === "pago"
                                  ? "Pago"
                                  : selectedMovementDetails.type === "retencion"
                                    ? "Abono"
                                    : selectedMovementDetails.type === "abono"
                                      ? "Abono"
                                      : selectedMovementDetails.type}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Descripción</Label>
                    <div className="text-sm bg-muted p-2 rounded whitespace-pre-wrap">
                      {selectedMovementDetails.description
                        ?.split(',')
                        .map((item, idx) => (
                          <div key={idx}>{item.trim()}</div>
                        ))}
                    </div>
                  </div>

                  {(() => {
                    const folios = Array.isArray((selectedMovementDetails as any)?.fruitReceptions)
                      ? [...new Set(
                          (selectedMovementDetails as any).fruitReceptions
                            .map((r: any) => r.trackingFolio)
                            .filter(Boolean)
                        )]
                      : (selectedMovementDetails as any)?.fruitReception?.trackingFolio
                        ? [(selectedMovementDetails as any).fruitReception.trackingFolio]
                        : []
                    return folios.length > 0 ? (
                      <div>
                        <Label className="text-xs text-muted-foreground">Folio(s) de Seguimiento</Label>
                        <div className="flex flex-wrap gap-2">
                          {folios.map((folio) => (
                            <span
                              key={folio}
                              className="font-mono text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded border border-blue-200"
                            >
                              {folio}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null
                  })()}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Referencia</Label>
                      <div className="font-mono text-sm">{selectedMovementDetails.referenceNumber || "—"}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Monto</Label>
                      <div className={selectedMovementDetails.amount > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        {selectedMovementDetails.amount > 0 ? "+" : ""}
                        {safeCurrency(selectedMovementDetails.amount)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Saldo</Label>
                    <div className={selectedMovementDetails.balance > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                      {safeCurrency(selectedMovementDetails.balance)}
                    </div>
                  </div>

                  {selectedMovementDetails.evidenceUrl && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs text-muted-foreground">Documento Adjunto (PDF)</Label>
                          <div className="text-sm mt-1 text-green-700">Archivo disponible</div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(selectedMovementDetails.evidenceUrl, "_blank")}
                        >
                          <Eye className="mr-2 h-4 w-4" /> Ver
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsMovementDetailsOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
