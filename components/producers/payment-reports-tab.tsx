"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Search, Eye, ChevronsUpDown, ArrowUp, ArrowDown, CalendarIcon, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import type { PaymentReport, PaymentReportStatus } from "@/lib/types"
import { usePaymentReports } from "@/lib/hooks/use-producers"
import { TablePagination, usePagination } from "@/components/ui/table-pagination"
import Spinner2 from "@/components/ui/spinner2"
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
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [sortBy, setSortBy] = useState<"producer" | "code" | "date" | "total">("producer")
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewReport, setViewReport] = useState<PaymentReport | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()

  const { paymentReports, mutate, isLoading } = usePaymentReports()
  const { toast } = useToast()

  const sortedReports = useMemo(() => {
    const items = [...(paymentReports || [])]
    items.sort((a, b) => {
      switch (sortBy) {
        case "code": {
          const av = String(a.code || "").toLowerCase()
          const bv = String(b.code || "").toLowerCase()
          return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
        }
        case "date": {
          const aTime = new Date(a.date || 0).getTime() || 0
          const bTime = new Date(b.date || 0).getTime() || 0
          return sortOrder === "asc" ? aTime - bTime : bTime - aTime
        }
        case "total": {
          const an = Number(a.totalToPay || a.total || 0)
          const bn = Number(b.totalToPay || b.total || 0)
          return sortOrder === "asc" ? an - bn : bn - an
        }
        case "producer":
        default: {
          const an = (a.producer?.name || "").toLowerCase()
          const bn = (b.producer?.name || "").toLowerCase()
          return sortOrder === "asc" ? an.localeCompare(bn) : bn.localeCompare(an)
        }
      }
    })
    return items
  }, [paymentReports, sortBy, sortOrder])

  const filteredReports = useMemo(
    () =>
      (sortedReports || []).filter((report) => {
        // Búsqueda por múltiples campos del reporte y productor
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch =
          (report.code || "").toLowerCase().includes(searchLower) ||
          (report.producer?.name || "").toLowerCase().includes(searchLower) ||
          (report.producer?.code || "").toLowerCase().includes(searchLower) ||
          (report.producer?.rfc || "").toLowerCase().includes(searchLower) ||
          (report.producer?.phone || "").toLowerCase().includes(searchLower) ||
          (report.producer?.email || "").toLowerCase().includes(searchLower) ||
          (report.producer?.city || "").toLowerCase().includes(searchLower)

        // Filtro de estado
        const matchesStatus = !statusFilter || statusFilter === "all" || report.status === statusFilter

        // Filtro de fecha
        const reportDate = report.date ? new Date(report.date) : null
        const matchesDateFrom = !dateFrom || (reportDate && reportDate >= dateFrom)
        const matchesDateTo = !dateTo || (reportDate && reportDate <= dateTo)

        return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo
      }),
    [sortedReports, searchTerm, statusFilter, dateFrom, dateTo]
  )

  const { pagedItems, paginationProps } = usePagination(filteredReports, 20)

  const openViewDialog = (report: PaymentReport) => {
    setViewReport(report)
    setIsViewDialogOpen(true)
  }

  const closeViewDialog = () => {
    setIsViewDialogOpen(false)
    setViewReport(null)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Reportes de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-4">
            <div className="flex items-end gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, productor, RFC, teléfono, email o ciudad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="px-3">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? formatDate(dateFrom.toString()) : "Desde"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    disabled={(date) => dateTo ? date > dateTo : false}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="px-3">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? formatDate(dateTo.toString()) : "Hasta"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    disabled={(date) => dateFrom ? date < dateFrom : false}
                  />
                </PopoverContent>
              </Popover>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Ordenar por..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="producer">Productor (A–Z)</SelectItem>
                  <SelectItem value="code">Código</SelectItem>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="total">Total a pagar</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => setSortOrder((s) => (s === "asc" ? "desc" : "asc"))} title="Invertir orden" className="px-3">
                <ChevronsUpDown className="mr-2 h-4 w-4" />
                {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setDateFrom(undefined)
                  setDateTo(undefined)
                  setStatusFilter("")
                  setSortBy("producer")
                  setSortOrder("desc")
                }}
                className="px-3"
                title="Limpiar todos los filtros"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner2 />
            </div>
          ) : (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Productor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedItems.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-medium">{r.code}</TableCell>
                      <TableCell>{r.producer?.name || "-"}</TableCell>
                      <TableCell className="text-sm">{r.date ? formatDate(r.date) : "-"}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(r.totalToPay || r.total || 0))}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[r.status as PaymentReportStatus]?.variant || "outline"}>
                          {statusConfig[r.status as PaymentReportStatus]?.label || r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openViewDialog(r)}>
                          <Eye className="mr-2 h-4 w-4" /> Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <TablePagination {...paginationProps} />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Reporte</DialogTitle>
          </DialogHeader>
          {viewReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Código</Label>
                  <div className="font-mono font-medium text-lg">{viewReport.code}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <div className="mt-2">
                    <Badge variant={statusConfig[viewReport.status as PaymentReportStatus]?.variant || "outline"}>
                      {statusConfig[viewReport.status as PaymentReportStatus]?.label || viewReport.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Productor</Label>
                  <div className="font-medium">{viewReport.producer?.name || "-"}</div>
                  {viewReport.producer?.code && (
                    <div className="text-sm text-muted-foreground font-mono">{viewReport.producer.code}</div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha</Label>
                  <div>{viewReport.date ? formatDate(viewReport.date) : "-"}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Subtotal</Label>
                  <div className="font-medium">{formatCurrency(Number(viewReport.subtotal || 0))}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Retención</Label>
                  <div className="font-medium text-orange-600">{formatCurrency(Number(viewReport.retentionAmount || 0))}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total a Pagar</Label>
                  <div className="font-bold text-lg">{formatCurrency(Number(viewReport.totalToPay || viewReport.total || 0))}</div>
                </div>
              </div>

              {viewReport.retentionNotes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <Label className="text-xs text-muted-foreground">Motivo de Retención</Label>
                  <div className="text-sm mt-1">{viewReport.retentionNotes}</div>
                </div>
              )}

              {viewReport.notes && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <Label className="text-xs text-muted-foreground">Notas</Label>
                  <div className="text-sm mt-1 whitespace-pre-wrap">{viewReport.notes}</div>
                </div>
              )}

              {!viewReport.notes && !viewReport.retentionNotes && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No hay notas en este reporte
                </div>
              )}

              {viewReport.evidenceUrl && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">Complemento de Pago (PDF)</Label>
                      <div className="text-sm mt-1 text-green-700">Archivo adjunto</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(viewReport.evidenceUrl, "_blank")}
                    >
                      <Eye className="mr-2 h-4 w-4" /> Ver PDF
                    </Button>
                  </div>
                </div>
              )}

              {viewReport.items && viewReport.items.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Items del Reporte</Label>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cajas</TableHead>
                          <TableHead className="text-right">Precio/Caja</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewReport.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{item.boxes}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(Number(item.pricePerBox || 0))}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{formatCurrency(Number(item.subtotal || 0))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
