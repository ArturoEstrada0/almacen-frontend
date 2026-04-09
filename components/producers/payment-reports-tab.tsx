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
import { Label } from "@/components/ui/label"
import { Search, Eye, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"
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
      (sortedReports || []).filter((report) =>
        (report.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.producer?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [sortedReports, searchTerm]
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
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por código o productor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="producer">Productor (A–Z)</SelectItem>
                <SelectItem value="code">Código</SelectItem>
                <SelectItem value="date">Fecha</SelectItem>
                <SelectItem value="total">Total a pagar</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setSortOrder((s) => (s === "asc" ? "desc" : "asc"))} title="Invertir orden">
              <ChevronsUpDown className="mr-2 h-4 w-4" />
              {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ver Reporte</DialogTitle>
          </DialogHeader>
          {viewReport && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Código</Label>
                <div className="font-mono font-medium">{viewReport.code}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Productor</Label>
                <div>{viewReport.producer?.name || "-"}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fecha</Label>
                <div>{viewReport.date ? formatDate(viewReport.date) : "-"}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Total a Pagar</Label>
                <div className="font-medium">{formatCurrency(Number(viewReport.totalToPay || viewReport.total || 0))}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <div>{statusConfig[viewReport.status as PaymentReportStatus]?.label || viewReport.status}</div>
              </div>

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
