"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Search, Eye, ChevronsUpDown, ArrowUp, ArrowDown, CalendarIcon, X, FileText } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import type { PaymentReport } from "@/lib/types"
import { usePaymentReports } from "@/lib/hooks/use-producers"
import { TablePagination, usePagination } from "@/components/ui/table-pagination"
import Spinner2 from "@/components/ui/spinner2"
import { useToast } from "@/hooks/use-toast"

export function PaymentReportsTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [sortBy, setSortBy] = useState<"producer" | "code" | "date" | "total">("date")
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewReport, setViewReport] = useState<PaymentReport | null>(null)
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()

  const { paymentReports, mutate, isLoading } = usePaymentReports()
  const { toast } = useToast()

  // Cargar filtros desde localStorage al montar
  useEffect(() => {
    const savedFilters = localStorage.getItem("paymentReportsFilters")
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters)
        setSearchTerm(filters.searchTerm || "")
        setSortOrder(filters.sortOrder || "desc")
        setSortBy(filters.sortBy || "date")
        if (filters.dateFrom) setDateFrom(new Date(filters.dateFrom))
        if (filters.dateTo) setDateTo(new Date(filters.dateTo))
      } catch (e) {
        console.error("Error loading filters:", e)
      }
    }
  }, [])

  // Guardar filtros en localStorage cuando cambian
  useEffect(() => {
    const filters = {
      searchTerm,
      sortOrder,
      sortBy,
      dateFrom: dateFrom?.toISOString(),
      dateTo: dateTo?.toISOString(),
    }
    localStorage.setItem("paymentReportsFilters", JSON.stringify(filters))
  }, [searchTerm, sortOrder, sortBy, dateFrom, dateTo])

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
        const folios = (report.items || [])
          .map((item: any) => item.fruitReception?.trackingFolio)
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        const matchesSearch =
          (report.code || "").toLowerCase().includes(searchLower) ||
          (report.producer?.name || "").toLowerCase().includes(searchLower) ||
          (report.producer?.code || "").toLowerCase().includes(searchLower) ||
          (report.producer?.rfc || "").toLowerCase().includes(searchLower) ||
          (report.producer?.phone || "").toLowerCase().includes(searchLower) ||
          (report.producer?.email || "").toLowerCase().includes(searchLower) ||
          (report.producer?.city || "").toLowerCase().includes(searchLower) ||
          folios.includes(searchLower)

        // Filtro de fecha
        const reportDate = report.date ? new Date(report.date) : null
        const matchesDateFrom = !dateFrom || (reportDate && reportDate >= dateFrom)
        const matchesDateTo = !dateTo || (reportDate && reportDate <= dateTo)

        return matchesSearch && matchesDateFrom && matchesDateTo
      }),
    [sortedReports, searchTerm, dateFrom, dateTo]
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

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="producer">Productor (A–Z)</SelectItem>
                  <SelectItem value="code">Código</SelectItem>
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
                  setSortBy("date")
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
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedItems.map((r, idx) => (
                    <TableRow key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <TableCell className="font-mono font-medium">{r.code}</TableCell>
                      <TableCell>{r.producer?.name || "-"}</TableCell>
                      <TableCell className="text-sm">{r.date ? formatDate(r.date) : "-"}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(r.totalToPay || r.total || 0))}</TableCell>
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
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="sticky top-0 bg-white z-10 border-b px-6 py-4">
            <DialogTitle>Detalles del Reporte</DialogTitle>
          </DialogHeader>
          {viewReport && (
            <div className="overflow-y-auto flex-1 px-6">
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Código</Label>
                  <div className="font-mono font-medium text-lg">{viewReport.code}</div>
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

              <div className="p-3 border rounded-md space-y-3">
                <Label className="text-xs text-muted-foreground">Complementos de Pago (PDF)</Label>

                {(() => {
                  const complementUrl = (viewReport as any).paymentComplementUrl || (viewReport as any).receiptUrl || (viewReport as any).invoiceUrl
                  return complementUrl ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-700">Documento del reporte</p>
                          <p className="text-xs text-muted-foreground">PDF disponible</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(complementUrl, "_blank")}
                        >
                          <Eye className="mr-2 h-4 w-4" /> Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement("a")
                            link.href = complementUrl
                            link.download = `complemento-pago-${viewReport.code}.pdf`
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                          }}
                        >
                          Descargar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-muted-foreground">
                      Sin complemento...
                    </div>
                  )
                })()}
              </div>

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

              {(() => {
                const folios = viewReport.items
                  ? [...new Set(
                      viewReport.items
                        .map((item: any) => item.fruitReception?.trackingFolio)
                        .filter(Boolean)
                    )]
                  : []
                return folios.length > 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Folio(s) de Seguimiento</p>
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

              <DialogFooter className="sticky bottom-0 bg-white border-t px-6 py-4">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
