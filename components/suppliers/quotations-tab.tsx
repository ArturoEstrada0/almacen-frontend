"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
// products and suppliers come from API hooks
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { useProducts } from "@/lib/hooks/use-products"
import { createQuotation, useQuotations } from "@/lib/hooks/use-quotations"
import { toast } from "@/lib/utils/toast"
import { Plus, Trash2, Send, Building2, Package, Eye, RefreshCw, FileText, Clock, CheckCircle, Mail } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ProtectedCreate, ProtectedDelete } from "@/components/auth/protected-action"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
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
  enviada: "Enviada",
  parcial: "Parcial",
  completada: "Completada",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
}

const statusColors: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-800",
  pendiente: "bg-yellow-100 text-yellow-800",
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
  const [validUntil, setValidUntil] = useState(() => {
    // Por defecto, 7 días a partir de hoy
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date.toISOString().split('T')[0]
  })
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null)
  
  // Hook para obtener cotizaciones existentes
  const { quotations, isLoading: quotationsLoading, mutate: refreshQuotations } = useQuotations()

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

  const { suppliers: apiSuppliers } = useSuppliers()
  const { products } = useProducts()

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

    try {
      toast.loading("Creando solicitud de cotización...")
      const payload = {
        description: emailMessage || undefined,
        validUntil: validUntil,
        items: quotationItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        supplierIds: selectedSuppliers,
      }
      console.log("Sending payload:", JSON.stringify(payload, null, 2))
      console.log("quotationItems state:", quotationItems)
      const created = await createQuotation(payload)
      toast.dismiss()
      toast.success("Cotización creada y correos enviados")
      console.log("Created quotation", created)
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

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy", { locale: es })
    } catch {
      return dateStr
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
              <div className="text-center py-8 text-muted-foreground">Cargando cotizaciones...</div>
            ) : quotations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cotizaciones. Crea una nueva en la pestaña "Nueva Cotización".
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
                    {quotations.map((quotation: any) => (
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
                          <Badge className={statusColors[quotation.status] || "bg-gray-100"}>
                            {statusLabels[quotation.status] || quotation.status}
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
                                      Creada el {formatDate(quotation.createdAt || quotation.date)}
                                      {quotation.validUntil && (
                                        <span className="ml-2">• Válida hasta {formatDate(quotation.validUntil)}</span>
                                      )}
                                    </DialogDescription>
                                  </div>
                                  <Badge className={`${statusColors[quotation.status] || "bg-gray-100"} ml-4`}>
                                    {statusLabels[quotation.status] || quotation.status}
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
                                                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
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
                    ))}
                  </TableBody>
                </Table>
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
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <CardTitle>Proveedores Disponibles</CardTitle>
            <CardDescription>
              Selecciona los proveedores a los que deseas enviar la solicitud de cotización
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

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
                      <Input
                        id="validUntil"
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
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
