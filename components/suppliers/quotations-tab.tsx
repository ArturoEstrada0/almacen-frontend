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
import { createQuotation } from "@/lib/hooks/use-quotations"
import { toast } from "@/lib/utils/toast"
import { Plus, Trash2, Send, Building2, Package } from "lucide-react"
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

interface QuotationItem {
  id: string
  productId: string
  quantity: number
}

export function QuotationsTab() {
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("")
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [emailMessage, setEmailMessage] = useState("")

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
        items: quotationItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      }
      const created = await createQuotation(payload)
      toast.success("Cotización creada")
      console.log("Created quotation", created)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Error creando cotización")
    }
  }

  return (
    <div className="space-y-6">
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
    </div>
  )
}
