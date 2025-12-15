"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Check, ChevronsUpDown, Loader2, Plus, Trash2, ArrowLeft, Package, Building2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface Product {
  id: string
  code: string
  name: string
  unit?: {
    abbreviation: string
    name: string
  }
}

interface Supplier {
  id: string
  code: string
  name: string
  email: string
  contactName?: string
}

interface QuotationItem {
  productId: string
  product?: Product
  quantity: number
  notes?: string
}

export default function NewQuotationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  
  // Form state
  const [description, setDescription] = useState("")
  const [validUntil, setValidUntil] = useState<Date>(addDays(new Date(), 7))
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<QuotationItem[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  
  // Data
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  
  // UI state
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [productSearchValue, setProductSearchValue] = useState("")
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const [productsRes, suppliersRes] = await Promise.all([
        fetch(`${apiUrl}/products`),
        fetch(`${apiUrl}/suppliers`),
      ])

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData)
      }

      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json()
        // Solo mostrar proveedores con email
        setSuppliers(suppliersData.filter((s: Supplier) => s.email))
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Error al cargar los datos")
    } finally {
      setLoadingData(false)
    }
  }

  const addItem = (product: Product) => {
    if (items.some((item) => item.productId === product.id)) {
      toast.error("Este producto ya está en la lista")
      return
    }
    setItems([...items, { productId: product.id, product, quantity: 1 }])
    setProductSearchOpen(false)
    setProductSearchValue("")
  }

  const removeItem = (productId: string) => {
    setItems(items.filter((item) => item.productId !== productId))
  }

  const updateItemQuantity = (productId: string, quantity: number) => {
    setItems(
      items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    )
  }

  const updateItemNotes = (productId: string, notes: string) => {
    setItems(
      items.map((item) =>
        item.productId === productId ? { ...item, notes } : item
      )
    )
  }

  const toggleSupplier = (supplierId: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    )
  }

  const handleSubmit = async () => {
    // Validaciones
    if (items.length === 0) {
      toast.error("Agrega al menos un producto a la cotización")
      return
    }

    if (selectedSuppliers.length === 0) {
      toast.error("Selecciona al menos un proveedor")
      return
    }

    if (!validUntil) {
      toast.error("Selecciona una fecha de vencimiento")
      return
    }

    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${apiUrl}/quotations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description,
          validUntil: format(validUntil, "yyyy-MM-dd"),
          notes,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
          })),
          supplierIds: selectedSuppliers,
        }),
      })

      if (response.ok) {
        const quotation = await response.json()
        toast.success("Cotización creada exitosamente")
        router.push(`/quotations/${quotation.id}`)
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al crear la cotización")
      }
    } catch (error) {
      console.error("Error creating quotation:", error)
      toast.error("Error al crear la cotización")
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(productSearchValue.toLowerCase()) ||
      product.code.toLowerCase().includes(productSearchValue.toLowerCase())
  )

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/quotations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva Cotización</h1>
          <p className="text-muted-foreground">
            Crea una solicitud de cotización para enviar a proveedores
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Ej: Cotización de insumos para producción de enero"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Fecha de Vencimiento</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !validUntil && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {validUntil
                          ? format(validUntil, "PPP", { locale: es })
                          : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={validUntil}
                        onSelect={(date) => {
                          if (date) setValidUntil(date)
                          setCalendarOpen(false)
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notas para Proveedores</Label>
                <Textarea
                  id="notes"
                  placeholder="Instrucciones o información adicional para los proveedores..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Productos a Cotizar
                  </CardTitle>
                  <CardDescription>
                    Agrega los productos que deseas cotizar
                  </CardDescription>
                </div>
                <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Producto
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="end">
                    <Command>
                      <CommandInput
                        placeholder="Buscar producto..."
                        value={productSearchValue}
                        onValueChange={setProductSearchValue}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron productos.</CommandEmpty>
                        <CommandGroup>
                          {filteredProducts.slice(0, 10).map((product) => (
                            <CommandItem
                              key={product.id}
                              onSelect={() => addItem(product)}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{product.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {product.code} - {product.unit?.abbreviation || "pz"}
                                </span>
                              </div>
                              {items.some((i) => i.productId === product.id) && (
                                <Check className="ml-auto h-4 w-4 text-green-500" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay productos agregados</p>
                  <p className="text-sm">Usa el botón "Agregar Producto" para comenzar</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-[120px]">Cantidad</TableHead>
                      <TableHead className="w-[200px]">Notas</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.product?.code} - {item.product?.unit?.abbreviation || "pz"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQuantity(
                                item.productId,
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Opcional"
                            value={item.notes || ""}
                            onChange={(e) =>
                              updateItemNotes(item.productId, e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.productId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Suppliers */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Proveedores
              </CardTitle>
              <CardDescription>
                Selecciona los proveedores a los que enviar la cotización
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">
                    No hay proveedores con email configurado.
                  </p>
                  <Link href="/suppliers">
                    <Button variant="link" className="mt-2">
                      Ir a Proveedores
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {suppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedSuppliers.includes(supplier.id)
                          ? "bg-primary/5 border-primary"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleSupplier(supplier.id)}
                    >
                      <Checkbox
                        checked={selectedSuppliers.includes(supplier.id)}
                        onCheckedChange={() => toggleSupplier(supplier.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{supplier.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {supplier.email}
                        </p>
                        {supplier.contactName && (
                          <p className="text-xs text-muted-foreground">
                            Contacto: {supplier.contactName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedSuppliers.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedSuppliers.length} proveedor(es) seleccionado(s)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Productos:</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Proveedores:</span>
                <span className="font-medium">{selectedSuppliers.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Válida hasta:</span>
                <span className="font-medium">
                  {format(validUntil, "dd/MM/yyyy")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={loading || items.length === 0 || selectedSuppliers.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Cotización"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
