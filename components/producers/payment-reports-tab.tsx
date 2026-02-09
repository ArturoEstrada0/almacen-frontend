"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Eye, CheckCircle } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import type { PaymentReport, PaymentReportStatus } from "@/lib/types"
import { usePaymentReports } from "@/lib/hooks/use-producers"
import { TablePagination, usePagination } from "@/components/ui/table-pagination"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import { useToast } from "@/hooks/use-toast"

const statusConfig: Record<
  PaymentReportStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  pagado: { label: "Pagado", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
}

export function PaymentReportsTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // View state
  const [viewReport, setViewReport] = useState<PaymentReport | null>(null)

  // Update to Pagado state
  const [updateReport, setUpdateReport] = useState<PaymentReport | null>(null)
  const [invoiceUrl, setInvoiceUrl] = useState("")
  const [receiptUrl, setReceiptUrl] = useState("")
  const [paymentComplementUrl, setPaymentComplementUrl] = useState("")
  const [isrAmount, setIsrAmount] = useState("")

  const { paymentReports, mutate } = usePaymentReports()
  const { toast } = useToast()

  const filteredReports = (paymentReports || []).filter((report) =>
    report.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination
  const { pagedItems: pagedReports, paginationProps } = usePagination(filteredReports, 20)

  const openViewDialog = (report: PaymentReport) => {
    setViewReport(report)
    setIsViewDialogOpen(true)
  }

  const openUpdateDialog = (report: PaymentReport) => {
    setUpdateReport(report)
    setInvoiceUrl("")
    setReceiptUrl("")
    setPaymentComplementUrl("")
    setIsrAmount("")
    setIsUpdateDialogOpen(true)
  }

  const handleUpdateToPagado = async () => {
    if (!updateReport) return

    try {
      setIsSaving(true)
      
      const payload = {
        status: "pagado" as PaymentReportStatus,
        invoiceUrl: invoiceUrl || undefined,
        receiptUrl: receiptUrl || undefined,
        paymentComplementUrl: paymentComplementUrl || undefined,
        isrAmount: isrAmount ? parseFloat(isrAmount) : undefined,
      }

      await ApiClient.patch(
        API_ENDPOINTS.producers.paymentReports.updateStatus(updateReport.id),
        payload
      )

      toast({
        title: "Éxito",
        description: "El reporte de pago ha sido actualizado a 'Pagado' y los movimientos han sido registrados.",
      })

      mutate()
      setIsUpdateDialogOpen(false)
      setUpdateReport(null)
    } catch (error: any) {
      console.error("Error updating payment report:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el reporte de pago",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reportes de Pago</CardTitle>
            <CardDescription>Histórico de reportes de pago a productores (generados automáticamente)</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <TablePagination {...paginationProps} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Productor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Recepciones</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Retención</TableHead>
                <TableHead>Total a Pagar</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[150px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No hay reportes de pago registrados
                  </TableCell>
                </TableRow>
              ) : (
                pagedReports.map((report) => {
                  const statusInfo = statusConfig[report.status]
                  return (
                    <TableRow key={report.id}>
                      <TableCell className="font-mono">{report.code}</TableCell>
                      <TableCell>{report.producer?.name}</TableCell>
                      <TableCell>{formatDate(report.date)}</TableCell>
                      <TableCell>{report.items.length}</TableCell>
                      <TableCell>{formatCurrency(report.subtotal)}</TableCell>
                      <TableCell className="text-destructive">
                        {report.retentionAmount > 0 ? formatCurrency(report.retentionAmount) : "-"}
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(report.totalToPay)}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openViewDialog(report)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {report.status === "pendiente" && (
                            <Button variant="default" size="sm" onClick={() => openUpdateDialog(report)}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Pagado
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination {...paginationProps} />
      </CardContent>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalle del Reporte de Pago</DialogTitle>
          </DialogHeader>
          {viewReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Código</Label>
                  <p className="font-mono">{viewReport.code}</p>
                </div>
                <div>
                  <Label>Productor</Label>
                  <p>{viewReport.producer?.name}</p>
                </div>
                <div>
                  <Label>Fecha</Label>
                  <p>{formatDate(viewReport.date)}</p>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Badge variant={statusConfig[viewReport.status].variant}>
                    {statusConfig[viewReport.status].label}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Recepciones Incluidas</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Folio</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cajas</TableHead>
                      <TableHead>Precio/Caja</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewReport.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.fruitReception?.receptionNumber}</TableCell>
                        <TableCell>{item.fruitReception?.product?.name}</TableCell>
                        <TableCell>{item.boxes}</TableCell>
                        <TableCell>{formatCurrency(item.pricePerBox)}</TableCell>
                        <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Subtotal:</span>
                  <span>{formatCurrency(viewReport.subtotal)}</span>
                </div>
                {viewReport.retentionAmount > 0 && (
                  <>
                    <div className="flex justify-between text-destructive">
                      <span className="font-medium">Retención:</span>
                      <span>- {formatCurrency(viewReport.retentionAmount)}</span>
                    </div>
                    {viewReport.retentionNotes && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Motivo: </span>
                        {viewReport.retentionNotes}
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total a Pagar:</span>
                  <span>{formatCurrency(viewReport.totalToPay)}</span>
                </div>
              </div>

              {viewReport.notes && (
                <div>
                  <Label>Notas</Label>
                  <p className="text-sm text-muted-foreground">{viewReport.notes}</p>
                </div>
              )}

              {viewReport.status === "pagado" && (
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <Label>Método de Pago</Label>
                    <p>{viewReport.paymentMethod || "-"}</p>
                  </div>
                  <div>
                    <Label>Fecha de Pago</Label>
                    <p>{viewReport.paidAt ? formatDate(viewReport.paidAt) : "-"}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update to Pagado Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Actualizar Reporte a Pagado</DialogTitle>
          </DialogHeader>
          {updateReport && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Código:</span>
                  <span className="font-mono">{updateReport.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Productor:</span>
                  <span>{updateReport.producer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Subtotal:</span>
                  <span>{formatCurrency(updateReport.subtotal)}</span>
                </div>
                {updateReport.retentionAmount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span className="font-medium">Retención:</span>
                    <span>- {formatCurrency(updateReport.retentionAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total a Pagar:</span>
                  <span>{formatCurrency(updateReport.totalToPay)}</span>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Proporciona las URLs de los documentos y el monto de ISR (opcional). 
                  Al guardar se registrarán los movimientos contables y se marcarán las recepciones como pagadas.
                </p>

                <div>
                  <Label htmlFor="invoiceUrl">URL de la Factura (PDF) *</Label>
                  <Input
                    id="invoiceUrl"
                    placeholder="https://ejemplo.com/factura.pdf"
                    value={invoiceUrl}
                    onChange={(e) => setInvoiceUrl(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="receiptUrl">URL del Comprobante (PDF) *</Label>
                  <Input
                    id="receiptUrl"
                    placeholder="https://ejemplo.com/comprobante.pdf"
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="paymentComplementUrl">URL del Complemento de Pago (PDF) *</Label>
                  <Input
                    id="paymentComplementUrl"
                    placeholder="https://ejemplo.com/complemento.pdf"
                    value={paymentComplementUrl}
                    onChange={(e) => setPaymentComplementUrl(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="isrAmount">Valor de ISR (opcional)</Label>
                  <Input
                    id="isrAmount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={isrAmount}
                    onChange={(e) => {
                      const value = e.target.value
                      if (/^\d*\.?\d*$/.test(value)) {
                        setIsrAmount(value)
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    El ISR se descontará del monto a pagar final
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateToPagado} 
              disabled={isSaving || !invoiceUrl || !receiptUrl || !paymentComplementUrl}
            >
              {isSaving ? "Guardando..." : "Actualizar a Pagado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
