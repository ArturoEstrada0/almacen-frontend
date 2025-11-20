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
import { Search, Eye } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import type { PaymentReport, PaymentReportStatus } from "@/lib/types"
import { usePaymentReports } from "@/lib/hooks/use-producers"

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

  // View state
  const [viewReport, setViewReport] = useState<PaymentReport | null>(null)

  const { paymentReports } = usePaymentReports()

  const filteredReports = (paymentReports || []).filter((report) =>
    report.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openViewDialog = (report: PaymentReport) => {
    setViewReport(report)
    setIsViewDialogOpen(true)
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
                <TableHead className="w-[100px]">Ver</TableHead>
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
                filteredReports.map((report) => {
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
                        <Button variant="ghost" size="sm" onClick={() => openViewDialog(report)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
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
    </Card>
  )
}
