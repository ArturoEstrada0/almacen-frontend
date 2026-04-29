"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { ComboBox } from "@/components/ui/combobox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Download, Eye, FileText } from "lucide-react"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { usePurchaseOrder } from "@/lib/hooks/use-purchase-orders"
import { useProducts } from "@/lib/hooks/use-products"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { api } from "@/lib/config/api"
import Spinner2 from "@/components/ui/spinner2"
import { TablePagination, usePagination } from "@/components/ui/table-pagination"
import { formatCurrency } from "@/lib/utils/format"

export function PaymentsHistoryTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [dateRange, setDateRange] = useState<any | undefined>(undefined)
  const [supplierId, setSupplierId] = useState<string | undefined>(undefined)
  const [payments, setPayments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { suppliers } = useSuppliers()
  const [detailsOrderId, setDetailsOrderId] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  const { purchaseOrder: detailsOrder, isLoading: detailsLoading } = usePurchaseOrder(detailsOrderId || "")
  const { products } = useProducts()
  const { warehouses } = useWarehouses()

  const fetchPayments = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (supplierId) params.append("supplierId", supplierId)
      if (dateRange?.from) params.append("startDate", new Date(dateRange.from).toISOString().slice(0, 10))
      if (dateRange?.to) params.append("endDate", new Date(dateRange.to).toISOString().slice(0, 10))
      // status filter removed for payments history

      const query = params.toString() ? `?${params.toString()}` : ""
      const resp = await api.get(`/api/purchase-orders/payments${query}`)
      setPayments(resp || [])
    } catch (err: any) {
      console.error("Error fetching payments:", err)
      setPayments([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const filtered = payments.filter((p) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    const supplierName = (p.supplierName || "").toLowerCase()
    const orderCode = (p.purchaseOrderCode || "").toLowerCase()
    return supplierName.includes(term) || orderCode.includes(term) || String(p.reference || "").toLowerCase().includes(term)
  })

  const { pagedItems, paginationProps } = usePagination(filtered, 20)

  const formatDateSafely = (value?: string | Date | null) => {
    if (!value) return "-"
    if (typeof value === "string") {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (m) {
        const year = Number(m[1])
        const month = Number(m[2]) - 1
        const day = Number(m[3])
        return new Date(year, month, day).toLocaleDateString()
      }
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagos</CardTitle>
          <CardDescription>Registro de pagos realizados a proveedores</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" placeholder="Buscar por proveedor, orden o referencia..." />
            </div>

            <DateRangePicker value={dateRange} onChange={setDateRange} />

            <div className="w-[260px]">
              <ComboBox
                options={(suppliers || []).map((s: any) => ({ value: s.id, label: s.name, subtitle: s.code || s.business_name }))}
                value={supplierId || ""}
                onChange={(v) => setSupplierId(v || undefined)}
                placeholder="Proveedor"
                searchPlaceholder="Buscar proveedor..."
              />
            </div>

            {/* Estado filter removed for payments history */}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setSearchTerm(""); setDateRange(undefined); setSupplierId(undefined); fetchPayments() }}>Limpiar</Button>
              <Button onClick={fetchPayments}>Filtrar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Spinner2 /></div>
          ) : (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedItems.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono">{row.purchaseOrderCode || "-"}</TableCell>
                      <TableCell>{row.supplierName || "-"}</TableCell>
                      <TableCell>{row.paymentDate ? formatDateSafely(row.paymentDate) : "-"}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(row.amount || 0)}</TableCell>
                      <TableCell>{row.reference || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {row.invoiceFileUrl ? (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => window.open(row.invoiceFileUrl, "_blank")} aria-label="Ver comprobante" title="Ver comprobante">
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  try {
                                    const resp = await fetch(row.invoiceFileUrl, { credentials: 'same-origin' })
                                    if (!resp.ok) throw new Error('Network response was not ok')
                                    const blob = await resp.blob()
                                    const cd = resp.headers.get('content-disposition')
                                    let filename = 'comprobante'
                                    if (cd) {
                                      const m = cd.match(/filename\*=UTF-8''(.+)|filename="?([^";]+)"?/) 
                                      if (m) filename = decodeURIComponent((m[1]||m[2]||filename))
                                    } else {
                                      try {
                                        const urlParts = (row.invoiceFileUrl || '').split('/')
                                        const last = urlParts[urlParts.length-1]
                                        if (last) filename = last.split('?')[0]
                                      } catch (e) {}
                                    }
                                    const blobUrl = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = blobUrl
                                    a.download = filename
                                    document.body.appendChild(a)
                                    a.click()
                                    a.remove()
                                    URL.revokeObjectURL(blobUrl)
                                  } catch (e) {
                                    // fallback: open in new tab
                                    window.open(row.invoiceFileUrl, '_blank')
                                  }
                                }}
                                aria-label="Descargar comprobante"
                                title="Descargar comprobante"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-muted-foreground">sin comprobante</span>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const id = row.purchaseOrderId || row.purchase_order_id || row.purchaseOrder?.id || null
                              setDetailsOrderId(id)
                              setDetailsDialogOpen(true)
                            }}
                            aria-label="Ver orden"
                            title="Ver orden"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
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

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Orden de Compra {detailsOrder?.orderNumber || ""}</DialogTitle>
            <DialogDescription>Detalles de la orden de compra</DialogDescription>
          </DialogHeader>

          {detailsOrderId === null ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Orden no vinculada</div>
          ) : !detailsOrder ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Cargando detalle...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Proveedor</Label>
                  <p className="font-medium">{detailsOrder.supplier?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Almacén</Label>
                  <p className="font-medium">{detailsOrder.warehouse?.name || warehouses.find((w:any)=>w.id===detailsOrder.warehouseId)?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha de Orden</Label>
                  <p className="font-medium">{formatDateSafely(detailsOrder.orderDate as any)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Entrega Esperada</Label>
                  <p className="font-medium">{formatDateSafely(detailsOrder.expectedDeliveryDate as any)}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Productos</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Recibido</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailsOrder.items || []).map((item:any) => {
                      const product = products.find((p:any) => p.id === item.productId)
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{product?.name || item.product?.name || "-"}</TableCell>
                          <TableCell>{item.quantity || item.quantity_ordered || 0}</TableCell>
                          <TableCell>{item.receivedQuantity || item.quantity_received || 0}</TableCell>
                          <TableCell>{formatCurrency(item.unitPrice || item.unit_price || 0)}</TableCell>
                          <TableCell>{formatCurrency(item.total || item.total_amount || 0)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-4 border-t pt-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="font-medium">{formatCurrency(detailsOrder.subtotal || detailsOrder.sub_total || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">IVA</p>
                  <p className="font-medium">{formatCurrency(detailsOrder.tax || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrency(detailsOrder.total || 0)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
