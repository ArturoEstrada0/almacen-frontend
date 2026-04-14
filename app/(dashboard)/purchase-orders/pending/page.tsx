"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import { type DateRange } from "react-day-picker"
import { ApiClient, API_ENDPOINTS } from "@/lib/config/api"
import { Button } from "@/components/ui/button"
import { ComboBox } from "@/components/ui/combobox"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table"
import { formatLocalDateOnly } from "@/lib/date-utils"

type PendingRecord = {
  id: string
  code: string
  supplierId?: string
  supplierName?: string | null
  shipmentId?: string | null
  shipmentNumber?: string | null
  total: number
  date?: string
  dueDate?: string
  amountPaid?: number
  pendingAmount: number
}

type SupplierFilterOption = {
  id: string
  name: string
  rfc?: string
}

function daysUntil(dateStr?: string) {
  if (!dateStr) return Infinity
  const d = new Date(dateStr)
  const today = new Date()
  // clear time
  d.setHours(0,0,0,0)
  today.setHours(0,0,0,0)
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function PendingPurchaseOrdersPage() {
  const router = useRouter()
  const [records, setRecords] = useState<PendingRecord[]>([])
  const [suppliers, setSuppliers] = useState<SupplierFilterOption[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const searchParams = useSearchParams()
  const supplierId = searchParams ? searchParams.get('supplierId') : null
  const [selectedSupplierId, setSelectedSupplierId] = useState(supplierId || "all")

  const supplierOptions = useMemo(() => {
    return [
      { value: "all", label: "Todos los proveedores" },
      ...suppliers.map((s) => ({
        value: s.id,
        label: s.name,
        subtitle: s.rfc || undefined,
      })),
    ]
  }, [suppliers])

  const fetchData = async (range?: DateRange, supplierFilterId?: string | null) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      const effectiveSupplierId = supplierFilterId && supplierFilterId !== "all" ? supplierFilterId : null
      if (effectiveSupplierId) qs.set('supplierId', effectiveSupplierId)
      if (range?.from) qs.set('startDate', format(range.from, 'yyyy-MM-dd'))
      if (range?.to) qs.set('endDate', format(range.to, 'yyyy-MM-dd'))

      const url = `${API_ENDPOINTS.purchaseOrders.pending()}${qs.toString() ? `?${qs.toString()}` : ''}`
      const res = await ApiClient.get<PendingRecord[]>(url)
      setRecords(res || [])
    } catch (err) {
      console.error('Failed to load pending purchase orders', err)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true)
    try {
      const res = await ApiClient.get<SupplierFilterOption[]>(API_ENDPOINTS.suppliers.list())
      setSuppliers(res || [])
    } catch (err) {
      console.error('Failed to load suppliers for filter', err)
      setSuppliers([])
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const clearFilter = async () => {
    setDateRange(undefined)
    setSelectedSupplierId("all")
    await fetchData(undefined, "all")
  }

  useEffect(() => {
    setSelectedSupplierId(supplierId || "all")
    fetchData(undefined, supplierId || "all")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const grouped = useMemo(() => {
    const groups: Record<string, PendingRecord[]> = {
      'Vencidas': [],
      'Por vencer (0-7 días)': [],
      '7-30 días': [],
      '31-60 días': [],
      '61-90 días': [],
      '90+ días': [],
    }

    for (const r of records) {
      const days = daysUntil(r.dueDate)
      if (days < 0) groups['Vencidas'].push(r)
      else if (days <= 7) groups['Por vencer (0-7 días)'].push(r)
      else if (days <= 30) groups['7-30 días'].push(r)
      else if (days <= 60) groups['31-60 días'].push(r)
      else if (days <= 90) groups['61-90 días'].push(r)
      else groups['90+ días'].push(r)
    }

    return groups
  }, [records])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Facturas pendientes</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="mb-2 gap-2 px-0 hover:bg-transparent" onClick={() => router.push('/accounts?tab=suppliers')}>
            <ArrowLeft className="h-4 w-4" />
            Volver a proveedores
          </Button>
          <ComboBox
            options={supplierOptions}
            value={selectedSupplierId}
            onChange={(value) => setSelectedSupplierId(value || "all")}
            placeholder="Seleccionar proveedor"
            searchPlaceholder="Buscar proveedor..."
            emptyMessage="No se encontraron proveedores"
            disabled={loadingSuppliers || loading}
            className="w-[260px]"
          />
          <DateRangePicker value={dateRange} onChange={setDateRange} className="w-[220px]" />
          <Button variant="outline" onClick={clearFilter} disabled={loading}>Quitar filtro</Button>
          <Button onClick={() => fetchData(dateRange, selectedSupplierId)} disabled={loading}>{loading ? 'Cargando...' : 'Filtrar'}</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {Object.entries(grouped).map(([label, items]) => (
          <div key={label} className="rounded-md border p-4">
            <h3 className="mb-2 text-sm font-semibold">{label} <span className="text-sm text-muted-foreground">({items.length})</span></h3>
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay facturas en este grupo.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Embarque</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Fecha compra</TableHead>
                      <TableHead>Fecha promesa</TableHead>
                      <TableHead>Saldo pendiente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.supplierName || '-'}</TableCell>
                        <TableCell>{r.shipmentNumber || 'Sin embarque'}</TableCell>
                        <TableCell>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(r.total)}</TableCell>
                        <TableCell>{formatLocalDateOnly(r.date as any)}</TableCell>
                        <TableCell>{formatLocalDateOnly(r.dueDate as any)}</TableCell>
                        <TableCell>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(r.pendingAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
