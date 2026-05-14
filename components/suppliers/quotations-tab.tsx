"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
// products and suppliers come from API hooks
import { useSuppliersWithFilters } from "@/lib/hooks/use-suppliers"
import { useProducts } from "@/lib/hooks/use-products"
import { createQuotation, useQuotations } from "@/lib/hooks/use-quotations"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import { toast } from "@/lib/utils/toast"
import { Plus, Trash2, Send, Building2, Package, Eye, RefreshCw, FileText, Clock, Mail, CheckCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ComboBox } from "@/components/ui/combobox"
import { Checkbox } from "@/components/ui/checkbox"
import { ProtectedCreate, ProtectedDelete } from "@/components/auth/protected-action"
import Spinner2 from "@/components/ui/spinner2"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface QuotationItem {
  id: string
  productId: string
  quantity: number
}

const statusLabels: Record<string, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  pendiente_ganador: "Pendiente de ganador",
  enviada: "Enviada",
  parcial: "Parcial",
  completada: "Completada",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
}

const statusColors: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-800",
  pendiente: "bg-yellow-100 text-yellow-800",
  pendiente_ganador: "bg-amber-100 text-amber-800",
  enviada: "bg-blue-100 text-blue-800",
  parcial: "bg-orange-100 text-orange-800",
  completada: "bg-green-100 text-green-800",
  cerrada: "bg-purple-100 text-purple-800",
  cancelada: "bg-red-100 text-red-800",
}

export function QuotationsTab() {
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("")
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [emailMessage, setEmailMessage] = useState("")
  const toDateOnlyString = (value: Date) => {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const [validUntil, setValidUntil] = useState(() => {
    // Por defecto, 7 días a partir de hoy (fecha local, sin UTC)
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return toDateOnlyString(date)
  })
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null)
  const [selectingWinnerFor, setSelectingWinnerFor] = useState<string | null>(null)
  
  // Estados para búsqueda, filtro y paginación
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // Hook para obtener cotizaciones existentes
  const { quotations, isLoading: quotationsLoading, mutate: refreshQuotations } = useQuotations()

  // Funciones helper - definidas antes de usarlas
  const formatDate = (dateStr: any) => {
    if (!dateStr) return "-"
    try {
      // Para columnas DATE (YYYY-MM-DD), construir fecha local para evitar desfase UTC
      const match = String(dateStr).match(/^\d{4}-\d{2}-\d{2}$/)
      if (match) {
        const parts = dateStr.split("-")
        const parsed = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        return format(parsed, "dd MMM yyyy", { locale: es })
      }
      // Para timestamps, mostrar en UTC para mantener referencia del servidor
      const parsed = new Date(dateStr)
      return format(parsed, "dd MMM yyyy", { locale: es })
    } catch {
      return dateStr
    }
  }

  const getQuotationDisplayStatus = (quotation: any) => {
    if (!quotation) return "borrador"
    if (quotation.status === "completada" && !quotation.winningSupplierId) {
      return "pendiente_ganador"
    }
    return quotation.status
  }

  const canSelectWinner = (quotation: any) => {
    if (!quotation) return false
    if (["cerrada", "cancelada"].includes(String(quotation.status || "").toLowerCase())) return false
    return !quotation.winningSupplierId
  }

  const addQuotationItem = () => {
    if (selectedProduct && quantity) {
      setQuotationItems([
        ...quotationItems,
        {
          id: `item-${Date.now()}`,
          productId: selectedProduct,
          quantity: Number.parseInt(quantity),
        },
      ])
      setSelectedProduct("")
      setQuantity("")
    }
  }

  const removeQuotationItem = (id: string) => {
    setQuotationItems(quotationItems.filter((item) => item.id !== id))
  }

  // Función para buscar en cotizaciones
  const filterAndSearchQuotations = () => {
    let filtered = quotations

    // Filtro por estado
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((q: any) => {
        const displayStatus = getQuotationDisplayStatus(q)
        return selectedStatuses.includes(displayStatus)
      })
    }

    // Búsqueda por texto
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((quotation: any) => {
        // Buscar en código de cotización
        if (quotation.code?.toLowerCase().includes(query)) return true

        // Buscar en productos
        if (
          quotation.items?.some((item: any) =>
            item.product?.name?.toLowerCase().includes(query) ||
            item.product?.sku?.toLowerCase().includes(query)
          )
        )
          return true

        // Buscar en proveedores (nombre, código, RFC, email)
        if (
          quotation.supplierTokens?.some((token: any) => {
            const supplier = token.supplier
            return (
              supplier?.name?.toLowerCase().includes(query) ||
              supplier?.code?.toLowerCase().includes(query) ||
              supplier?.rfc?.toLowerCase().includes(query) ||
              supplier?.email?.toLowerCase().includes(query)
            )
          })
        )
          return true

        return false
      })
    }

    return filtered
  }

  const filteredQuotations = filterAndSearchQuotations()
  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedQuotations = filteredQuotations.slice(startIndex, startIndex + itemsPerPage)

  // Resetear a página 1 cuando cambia búsqueda o filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedStatuses])

  const { products } = useProducts()
  const selectedProductIds = Array.from(new Set(quotationItems.map((item) => item.productId)))
  const { suppliers: apiSuppliers } = useSuppliersWithFilters(
    quotationItems.length > 0 ? { productIds: selectedProductIds } : undefined,
  )

  // Map backend supplier shape to the UI-friendly shape used in the mock data
  const mappedSuppliers = (apiSuppliers || []).map((s: any) => ({
    id: s.id,
    code: s.code || "",
    businessName: s.name || s.businessName || "",
    rfc: s.rfc || s.taxId || "",
    businessType: s.businessType || "",
    contactName: s.contactName || "",
    phone: s.phone || "",
    email: s.email || "",
    isActive: s.active ?? true,
    productSuppliers: s.productSuppliers || [],
  }))

  const availableSuppliers = mappedSuppliers.filter((supplier) => supplier.isActive)

  const toggleSupplier = (supplierId: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId) ? prev.filter((id) => id !== supplierId) : [...prev, supplierId],
    )
  }

  const handleSendQuotations = async () => {
    if (selectedSuppliers.length === 0) {
      toast.error("Selecciona al menos un proveedor")
      return
    }
    if (quotationItems.length === 0) {
      toast.error("Agrega al menos un producto a la solicitud")
      return
    }

    // Verificar si algunos proveedores seleccionados no tienen email configurado
    const suppliersMissingEmail = (selectedSuppliers || [])
      .map((id) => (apiSuppliers || []).find((s: any) => s.id === id))
      .filter((s: any) => !s || !s.email)

    if (suppliersMissingEmail.length > 0) {
      const names = suppliersMissingEmail.map((s: any) => s?.name || s?.businessName || 'Proveedor').join(', ')
      toast.error(`Los siguientes proveedores no tienen email configurado: ${names}`)
      return
    }

    try {
      toast.loading("Creando solicitud de cotización...")
      const payload = {
        description: emailMessage || undefined,
        validUntil: validUntil,
        items: quotationItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        supplierIds: selectedSuppliers,
      }
      const created = await createQuotation(payload)
      toast.dismiss()
      toast.success("Cotización creada y correos enviados")
      // created quotation
      // Limpiar el formulario
      setQuotationItems([])
      setSelectedSuppliers([])
      setEmailMessage("")
      // Refrescar lista de cotizaciones
      refreshQuotations()
    } catch (err: any) {
      toast.dismiss()
      console.error(err)
      toast.error(err?.message || "Error creando cotización")
    }
  }

  const handleSelectWinner = async (quotation: any, supplierId: string, supplierName: string) => {
    setSelectingWinnerFor(`${quotation.id}:${supplierId}`)
    try {
      await ApiClient.patch(
        API_ENDPOINTS.quotations.markWinner(quotation.id, supplierId),
        {},
      )

      toast.success(`${supplierName} seleccionado como proveedor ganador`)
      await refreshQuotations()
    } catch (error: any) {
      toast.error(error?.message || "No se pudo seleccionar proveedor ganador")
    } finally {
      setSelectingWinnerFor(null)
    }
  }

  return (
    <Tabs defaultValue="list" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="list">
          <FileText className="mr-2 h-4 w-4" />
          Cotizaciones ({quotations.length})
        </TabsTrigger>
        <TabsTrigger value="new">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cotización
        </TabsTrigger>
      </TabsList>

      {/* Tab: Lista de Cotizaciones */}
      <TabsContent value="list" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cotizaciones</CardTitle>
              <CardDescription>Historial de solicitudes de cotización enviadas</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refreshQuotations()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
          </CardHeader>
          <CardContent>
            {quotationsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner2 />
              </div>
            ) : quotations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cotizaciones. Crea una nueva en la pestaña "Nueva Cotización".
              </div>
            ) : (
              <div className="space-y-4">
                {/* Barra de búsqueda y filtros */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Buscador */}
                    <div className="md:col-span-2">
                      <Label htmlFor="search" className="mb-2 block">Buscar</Label>
                      <Input
                        id="search"
                        placeholder="Buscar por código, productos, proveedor, RFC, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    {/* Filtro de estados */}
                    <div>
                      <Label htmlFor="status-filter" className="mb-2 block">Estado</Label>
                      <Select
                        value={selectedStatuses.length === 0 ? "all" : selectedStatuses[0]}
                        onValueChange={(value) => {
                          if (value === "all") {
                            setSelectedStatuses([])
                          } else {
                            setSelectedStatuses([value])
                          }
                        }}
                      >
                        <SelectTrigger id="status-filter">
                          <SelectValue placeholder="Todos los estados" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          {Object.keys(statusLabels).map((status) => (
                            <SelectItem key={status} value={status}>
                              {statusLabels[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Información de resultados */}
                  <div className="text-sm text-muted-foreground">
                    Mostrando {paginatedQuotations.length === 0 && filteredQuotations.length === 0 ? 0 : startIndex + 1} -{" "}
                    {Math.min(startIndex + itemsPerPage, filteredQuotations.length)} de {filteredQuotations.length} cotizaciones
                    {filteredQuotations.length < quotations.length && (
                      <span> (filtradas de {quotations.length})</span>
                    )}
                  </div>
                </div>

                {/* Tabla de cotizaciones */}
                {paginatedQuotations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground rounded-md border p-4">
                    {filteredQuotations.length === 0 && quotations.length > 0
                      ? "No hay cotizaciones que coincidan con tu búsqueda o filtros."
                      : "No hay cotizaciones disponibles."}
                  </div>
                ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Válido Hasta</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead>Proveedores</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedQuotations.map((quotation: any) => {
                      const displayStatus = getQuotationDisplayStatus(quotation)

                      return (
                      <TableRow key={quotation.id}>
                        <TableCell className="font-mono font-medium">{quotation.code}</TableCell>
                        <TableCell>{formatDate(quotation.date)}</TableCell>
                        <TableCell>{quotation.validUntil ? formatDate(quotation.validUntil) : "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{quotation.items?.length || 0} productos</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {quotation.supplierTokens?.map((token: any) => (
                              <div key={token.id} className="flex items-center gap-1 text-xs">
                                {token.emailSent ? (
                                  <Mail className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Clock className="h-3 w-3 text-yellow-500" />
                                )}
                                <span>{token.supplier?.name || "Proveedor"}</span>
                              </div>
                            )) || <span className="text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[displayStatus] || "bg-gray-100"}>
                            {statusLabels[displayStatus] || displayStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedQuotation(quotation)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                              <DialogHeader>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <DialogTitle className="text-xl">Cotización {quotation.code}</DialogTitle>
                                    <DialogDescription className="mt-1">
                                      Creada el {formatDate(quotation.date || quotation.createdAt)}
                                      {quotation.validUntil && (
                                        <span className="ml-2">• Válida hasta {formatDate(quotation.validUntil)}</span>
                                      )}
                                    </DialogDescription>
                                  </div>
                                  <Badge className={`${statusColors[displayStatus] || "bg-gray-100"} ml-4`}>
                                    {statusLabels[displayStatus] || displayStatus}
                                  </Badge>
                                </div>
                              </DialogHeader>
                              
                              <div className="space-y-6 mt-4">
                                {quotation.description && (
                                  <div className="bg-muted/50 rounded-lg p-4">
                                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Mensaje para proveedores</h4>
                                    <p className="text-sm">{quotation.description}</p>
                                  </div>
                                )}
                                
                                {/* Resumen de Respuestas por Proveedor */}
                                <div>
                                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Respuestas de Proveedores
                                  </h4>
                                  <div className="rounded-lg border overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-muted/50">
                                          <TableHead className="font-semibold">Producto</TableHead>
                                          <TableHead className="font-semibold text-center">Cantidad</TableHead>
                                          <TableHead className="font-semibold">Proveedor</TableHead>
                                          <TableHead className="font-semibold text-right">Precio Unit.</TableHead>
                                          <TableHead className="font-semibold text-right">Subtotal</TableHead>
                                          <TableHead className="font-semibold text-center">Entrega</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {quotation.items?.map((item: any) => {
                                          const hasResponses = item.supplierResponses?.length > 0;
                                          
                                          if (!hasResponses) {
                                            return (
                                              <TableRow key={item.id} className="hover:bg-muted/30">
                                                <TableCell>
                                                  <div>
                                                    <p className="font-medium text-sm">{item.product?.name || "Producto"}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">{item.product?.sku}</p>
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                  <span className="font-medium">{item.quantity}</span>
                                                  <span className="text-muted-foreground ml-1">{item.product?.unit?.symbol || "pz"}</span>
                                                </TableCell>
                                                <TableCell colSpan={4}>
                                                  <span className="text-sm text-muted-foreground italic">Sin respuestas aún</span>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          }
                                          
                                          return item.supplierResponses.map((resp: any, idx: number) => (
                                            <TableRow key={`${item.id}-${resp.id}`} className="hover:bg-muted/30">
                                              {idx === 0 ? (
                                                <>
                                                  <TableCell rowSpan={item.supplierResponses.length} className="align-top border-r">
                                                    <div>
                                                      <p className="font-medium text-sm">{item.product?.name || "Producto"}</p>
                                                      <p className="text-xs text-muted-foreground font-mono">{item.product?.sku}</p>
                                                    </div>
                                                  </TableCell>
                                                  <TableCell rowSpan={item.supplierResponses.length} className="text-center align-top border-r">
                                                    <span className="font-medium">{item.quantity}</span>
                                                    <span className="text-muted-foreground ml-1">{item.product?.unit?.symbol || "pz"}</span>
                                                  </TableCell>
                                                </>
                                              ) : null}
                                              <TableCell>
                                                <div className="flex items-center gap-2">
                                                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                                  <span className="font-medium text-sm">{resp.supplier?.name}</span>
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                  <span className="font-semibold">${Number(resp.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                                    {resp.currency}
                                                  </Badge>
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-right">
                                                <span className="font-medium">
                                                  ${(Number(resp.price) * Number(item.quantity)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-muted-foreground ml-1 text-xs">{resp.currency}</span>
                                              </TableCell>
                                              <TableCell className="text-center">
                                                {resp.leadTimeDays ? (
                                                  <Badge variant="secondary" className="font-normal">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {resp.leadTimeDays} {resp.leadTimeDays === 1 ? 'día' : 'días'}
                                                  </Badge>
                                                ) : (
                                                  <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ));
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>

                                {/* Proveedores Invitados */}
                                <div>
                                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Proveedores Invitados ({quotation.supplierTokens?.length || 0})
                                  </h4>
                                  <div className="grid gap-2">
                                    {quotation.supplierTokens?.map((token: any) => (
                                      <div key={token.id} className="flex items-center justify-between p-3 bg-muted/30 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-primary" />
                                          </div>
                                          <div>
                                            <p className="font-medium">{token.supplier?.name}</p>
                                            <p className="text-xs text-muted-foreground">{token.supplier?.email}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {quotation.winningSupplierId === token.supplierId && (
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                              Ganador
                                            </Badge>
                                          )}
                                          {token.emailSent ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                              <Mail className="mr-1 h-3 w-3" />
                                              Enviado
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                              <Clock className="mr-1 h-3 w-3" />
                                              Pendiente
                                            </Badge>
                                          )}
                                          {token.used && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                              <CheckCircle className="mr-1 h-3 w-3" />
                                              Respondió
                                            </Badge>
                                          )}
                                          {canSelectWinner(quotation) && token.used && (
                                            <Button
                                              size="sm"
                                              onClick={() => handleSelectWinner(quotation, token.supplierId, token.supplier?.name || "Proveedor")}
                                              disabled={selectingWinnerFor === `${quotation.id}:${token.supplierId}`}
                                            >
                                              {selectingWinnerFor === `${quotation.id}:${token.supplierId}` ? "Seleccionando..." : "Elegir ganador"}
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>
                )}

                {/* Controles de paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-4 mt-4 p-4 border rounded-lg bg-muted/30">
                    <div className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <div className="flex items-center gap-1">
                        {/* Números de página */}
                        {Array.from({ length: totalPages }).map((_, idx) => {
                          const page = idx + 1
                          const isNearCurrent =
                            page === currentPage || Math.abs(page - currentPage) <= 1
                          const isEndPage = page === 1 || page === totalPages

                          if (!isNearCurrent && !isEndPage) {
                            if (page === 2 || page === totalPages - 1) {
                              return (
                                <span key={page} className="text-muted-foreground">
                                  ...
                                </span>
                              )
                            }
                            return null
                          }

                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="h-8 w-8 p-0"
                            >
                              {page}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab: Nueva Cotización */}
      <TabsContent value="new" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva Solicitud de Cotización</CardTitle>
          <CardDescription>Selecciona los productos que deseas cotizar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="product">Producto</Label>
              <ComboBox
                options={products
                  .filter((p) => p.isActive !== false && !quotationItems.some((item) => item.productId === p.id))
                  .map((product) => ({
                    value: product.id,
                    label: `${product.name} (${product.sku})`,
                    subtitle: product.sku,
                  }))}
                value={selectedProduct}
                onChange={setSelectedProduct}
                placeholder="Selecciona un producto"
                searchPlaceholder="Buscar producto..."
              />
            </div>
            <div className="w-32">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <ProtectedCreate module="suppliers">
                <Button onClick={addQuotationItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar
                </Button>
              </ProtectedCreate>
            </div>
          </div>

          {quotationItems.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotationItems.map((item) => {
                    const product = products.find((p) => p.id === item.productId)
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{product?.sku}</TableCell>
                        <TableCell>{product?.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          <ProtectedDelete module="suppliers">
                            <Button variant="ghost" size="icon" onClick={() => removeQuotationItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </ProtectedDelete>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {quotationItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Proveedores Disponibles ({availableSuppliers.length})</CardTitle>
            <CardDescription>
              Solo se muestran los proveedores que tienen al menos uno de los productos seleccionados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableSuppliers.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay proveedores asociados a los productos seleccionados.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {availableSuppliers.map((supplier) => (
                  <Card
                    key={supplier.id}
                    className={`cursor-pointer transition-all ${
                      selectedSuppliers.includes(supplier.id) ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => toggleSupplier(supplier.id)}
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <Checkbox checked={selectedSuppliers.includes(supplier.id)} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{supplier.businessName}</p>
                            <p className="text-xs text-muted-foreground">{supplier.code}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>{supplier.email}</p>
                          <p>{supplier.phone}</p>
                          <Badge variant="outline" className="mt-2">
                            {supplier.businessType}
                          </Badge>
                        </div>

                        {supplier.productSuppliers?.length > 0 && (
                          <div className="mt-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">Productos asociados</p>
                            <div className="flex flex-wrap gap-2">
                              {supplier.productSuppliers.map((ps: any) => (
                                <Badge key={ps.id || ps.productId} variant="secondary" className="text-[10px]">
                                  {ps.product?.name || ps.product?.sku || "Producto"}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedSuppliers.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Cotización a {selectedSuppliers.length} Proveedor
                    {selectedSuppliers.length !== 1 ? "es" : ""}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Enviar Solicitud de Cotización</DialogTitle>
                    <DialogDescription>
                      Se enviará a {selectedSuppliers.length} proveedor{selectedSuppliers.length !== 1 ? "es" : ""}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="rounded-md border p-4">
                      <h4 className="font-medium mb-2">Productos a Cotizar:</h4>
                      <ul className="space-y-1 text-sm">
                        {quotationItems.map((item) => {
                          const product = products.find((p) => p.id === item.productId)
                          return (
                            <li key={item.id} className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              {product?.name} - Cantidad: {item.quantity}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="validUntil">Válido Hasta</Label>
                      <DatePicker value={validUntil} onChange={(v) => setValidUntil(v)} />
                      <p className="text-xs text-muted-foreground">
                        Fecha límite para que los proveedores respondan
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Mensaje Adicional</Label>
                      <Textarea
                        id="message"
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Agrega información adicional para los proveedores..."
                        rows={6}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline">Cancelar</Button>
                      <Button onClick={handleSendQuotations}>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar Cotizaciones
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      )}
      </TabsContent>
    </Tabs>
  )
}
