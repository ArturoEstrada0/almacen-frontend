"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { 
  ArrowLeft, 
  Loader2, 
  Trophy, 
  Check, 
  X, 
  DollarSign,
  Clock,
  AlertTriangle,
  Building2
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface ComparisonResponse {
  supplier: {
    id: string
    name: string
    code: string
  }
  price: number
  currency: string
  leadTimeDays?: number
  available: boolean
  notes?: string
}

interface ComparisonItem {
  item: {
    id: string
    quantity: number
    product: {
      id: string
      code: string
      name: string
      unit?: { abbreviation: string }
    }
  }
  responses: ComparisonResponse[]
  bestPrice?: {
    supplierId: string
    supplierName: string
    price: number
  }
}

interface ComparisonData {
  quotation: {
    id: string
    code: string
    status: string
    winningSupplierId?: string
  }
  comparison: ComparisonItem[]
}

export default function QuotationComparisonPage() {
  const params = useParams()
  const router = useRouter()
  const quotationId = params.id as string

  const [data, setData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectingWinner, setSelectingWinner] = useState(false)

  useEffect(() => {
    fetchComparison()
  }, [quotationId])

  const fetchComparison = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${apiUrl}/quotations/${quotationId}/comparison`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        toast.error("Error al cargar la comparación")
        router.push(`/quotations/${quotationId}`)
      }
    } catch (error) {
      console.error("Error fetching comparison:", error)
      toast.error("Error al cargar la comparación")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectWinner = async (supplierId: string, supplierName: string) => {
    setSelectingWinner(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${apiUrl}/quotations/${quotationId}/winner/${supplierId}`, {
        method: "PATCH",
      })

      if (response.ok) {
        toast.success(`${supplierName} seleccionado como ganador`)
        fetchComparison()
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al seleccionar ganador")
      }
    } catch (error) {
      toast.error("Error al seleccionar ganador")
    } finally {
      setSelectingWinner(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  // Obtener lista única de proveedores que respondieron
  const suppliers = new Map<string, { id: string; name: string }>()
  data.comparison.forEach((item) => {
    item.responses.forEach((resp) => {
      if (!suppliers.has(resp.supplier.id)) {
        suppliers.set(resp.supplier.id, resp.supplier)
      }
    })
  })
  const supplierList = Array.from(suppliers.values())

  // Calcular totales por proveedor
  const supplierTotals = new Map<string, { total: number; available: number; unavailable: number }>()
  supplierList.forEach((supplier) => {
    let total = 0
    let available = 0
    let unavailable = 0
    
    data.comparison.forEach((item) => {
      const response = item.responses.find((r) => r.supplier.id === supplier.id)
      if (response) {
        if (response.available) {
          total += response.price * Number(item.item.quantity)
          available++
        } else {
          unavailable++
        }
      }
    })
    
    supplierTotals.set(supplier.id, { total, available, unavailable })
  })

  const canSelectWinner = data.quotation.status !== "cerrada" && data.quotation.status !== "cancelada"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/quotations/${quotationId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Comparación de Cotizaciones
          </h1>
          <p className="text-muted-foreground">
            Cotización #{data.quotation.code}
          </p>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-100 border border-green-300"></div>
              <span>Mejor precio</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Check className="mr-1 h-3 w-3 text-green-500" />
                Disponible
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <X className="mr-1 h-3 w-3 text-red-500" />
                No disponible
              </Badge>
            </div>
            {data.quotation.winningSupplierId && (
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span>Proveedor ganador</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supplier Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {supplierList.map((supplier) => {
          const totals = supplierTotals.get(supplier.id)
          const isWinner = data.quotation.winningSupplierId === supplier.id

          return (
            <Card key={supplier.id} className={isWinner ? "border-yellow-400 bg-yellow-50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {supplier.name}
                  </CardTitle>
                  {isWinner && (
                    <Trophy className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total estimado:</span>
                  <span className="font-bold text-lg">
                    ${totals?.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Productos cotizados:</span>
                  <span>{totals?.available} / {data.comparison.length}</span>
                </div>
                {totals?.unavailable > 0 && (
                  <div className="flex items-center gap-1 text-sm text-orange-600">
                    <AlertTriangle className="h-3 w-3" />
                    {totals.unavailable} producto(s) no disponible(s)
                  </div>
                )}
                {canSelectWinner && !isWinner && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full mt-2" disabled={selectingWinner}>
                        <Trophy className="mr-2 h-4 w-4" />
                        Seleccionar como Ganador
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Seleccionar a {supplier.name} como ganador?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esto cerrará la cotización y marcará a este proveedor como el ganador. 
                          Podrás crear una orden de compra basada en su cotización.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleSelectWinner(supplier.id, supplier.name)}>
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {isWinner && (
                  <Badge className="w-full justify-center bg-yellow-200 text-yellow-800">
                    <Trophy className="mr-1 h-3 w-3" />
                    Ganador
                  </Badge>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Producto</CardTitle>
          <CardDescription>
            Comparación de precios y disponibilidad por producto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background min-w-[200px]">Producto</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  {supplierList.map((supplier) => (
                    <TableHead key={supplier.id} className="text-center min-w-[150px]">
                      {supplier.name}
                      {data.quotation.winningSupplierId === supplier.id && (
                        <Trophy className="inline ml-1 h-3 w-3 text-yellow-500" />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.comparison.map((compItem) => (
                  <TableRow key={compItem.item.id}>
                    <TableCell className="sticky left-0 bg-background">
                      <div>
                        <p className="font-medium">{compItem.item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {compItem.item.product.code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {compItem.item.quantity} {compItem.item.product.unit?.abbreviation || "pz"}
                    </TableCell>
                    {supplierList.map((supplier) => {
                      const response = compItem.responses.find((r) => r.supplier.id === supplier.id)
                      const isBestPrice = compItem.bestPrice?.supplierId === supplier.id

                      if (!response) {
                        return (
                          <TableCell key={supplier.id} className="text-center text-muted-foreground">
                            -
                          </TableCell>
                        )
                      }

                      if (!response.available) {
                        return (
                          <TableCell key={supplier.id} className="text-center">
                            <Badge variant="outline" className="text-red-500">
                              <X className="mr-1 h-3 w-3" />
                              No disponible
                            </Badge>
                          </TableCell>
                        )
                      }

                      return (
                        <TableCell
                          key={supplier.id}
                          className={`text-center ${isBestPrice ? "bg-green-50" : ""}`}
                        >
                          <div className="space-y-1">
                            <div className={`font-medium ${isBestPrice ? "text-green-700" : ""}`}>
                              ${response.price.toLocaleString("es-MX", { minimumFractionDigits: 2 })} {response.currency}
                            </div>
                            {response.leadTimeDays && (
                              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {response.leadTimeDays} días
                              </div>
                            )}
                            {response.notes && (
                              <p className="text-xs text-muted-foreground italic">
                                {response.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell className="sticky left-0 bg-muted/50">TOTAL ESTIMADO</TableCell>
                  <TableCell></TableCell>
                  {supplierList.map((supplier) => {
                    const totals = supplierTotals.get(supplier.id)
                    const isLowestTotal = supplierList.every((s) => {
                      const other = supplierTotals.get(s.id)
                      return !other || totals?.total <= other.total
                    })
                    
                    return (
                      <TableCell
                        key={supplier.id}
                        className={`text-center ${isLowestTotal ? "text-green-700 bg-green-50" : ""}`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {totals?.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
