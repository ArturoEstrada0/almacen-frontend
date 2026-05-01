"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ComboBox } from "@/components/ui/combobox"
import { apiPost } from "@/lib/db/localApi"
import { toast } from "@/lib/utils/toast"
import { useCategories } from "@/lib/hooks/use-categories"
import { useProductTypes } from "@/lib/hooks/use-product-types"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { addProductSupplier } from "@/lib/hooks/use-products"
import { updateInventoryStock } from "@/lib/hooks/use-inventory"

export default function NewProductPage() {
  const router = useRouter()
  const { categories } = useCategories()
  const { productTypes } = useProductTypes()
  const { suppliers } = useSuppliers()
  const { warehouses } = useWarehouses()
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [warehouseSearch, setWarehouseSearch] = useState("")
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    type: "",
    categoryId: "",
    barcode: "",
    unitOfMeasure: "Pieza",
    hasIva16: true,
    isActive: true,
  })
  const [supplierForm, setSupplierForm] = useState({ supplierId: "", price: "", preferred: true })
  const [warehouseInventory, setWarehouseInventory] = useState<Record<string, {
    minStock: string
    maxStock: string
    reorderPoint: string
    currentStock: string
  }>>({})

  const normalizeType = (value: string) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

  const productTypeNormalized = normalizeType(formData.type)

  const warehousesByProductType = useMemo(() => {
    if (!productTypeNormalized) return []

    return (warehouses || []).filter((warehouse: any) =>
      normalizeType(warehouse.type) === productTypeNormalized,
    )
  }, [warehouses, productTypeNormalized])

  const filteredWarehouses = useMemo(() => {
    return warehousesByProductType.filter((warehouse: any) => {
      const matchesSearch =
        String(warehouse.name || "").toLowerCase().includes(warehouseSearch.toLowerCase()) ||
        String(warehouse.code || "").toLowerCase().includes(warehouseSearch.toLowerCase())
      return matchesSearch
    })
  }, [warehousesByProductType, warehouseSearch])

  const clearFieldError = (field: string) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    const nextErrors: Record<string, string> = {}
    if (!formData.sku.trim()) nextErrors.sku = "El SKU es obligatorio"
    if (!formData.name.trim()) nextErrors.name = "El nombre es obligatorio"
    if (!formData.type) nextErrors.type = "Selecciona un tipo de producto"
    if (!formData.categoryId) nextErrors.categoryId = "Selecciona una categoría"
    if (!formData.unitOfMeasure.trim()) nextErrors.unitOfMeasure = "La unidad de medida es obligatoria"

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      toast.error("Completa los campos marcados")
      return
    }

    setFieldErrors({})

    setLoading(true)
    const loadingToast = toast.loading("Creando producto...")

    try {
      const payload = {
        sku: formData.sku.trim() || undefined,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        categoryId: formData.categoryId,
        barcode: formData.barcode.trim() || undefined,
        hasIva16: formData.hasIva16,
        active: formData.isActive,
      }

      const created: any = await apiPost("/products", payload)

      // Guardar inventario por almacén
      for (const warehouseId in warehouseInventory) {
        const invData = warehouseInventory[warehouseId]
        const hasData = invData.currentStock || invData.minStock || invData.maxStock || invData.reorderPoint

        if (hasData) {
          try {
            await updateInventoryStock({
              productId: created.id,
              warehouseId,
              quantity: invData.currentStock !== "" ? Number(invData.currentStock) : undefined,
              minStock: invData.minStock !== "" ? Number(invData.minStock) : undefined,
              maxStock: invData.maxStock !== "" ? Number(invData.maxStock) : undefined,
              reorderPoint: invData.reorderPoint !== "" ? Number(invData.reorderPoint) : undefined,
            })
          } catch (err) {
            console.error("Error actualizando inventario para almacén " + warehouseId, err)
          }
        }
      }

      if (supplierForm.supplierId && supplierForm.price && created?.id) {
        try {
          await addProductSupplier(created.id, {
            supplierId: supplierForm.supplierId,
            price: Number(supplierForm.price),
            preferred: supplierForm.preferred,
          })
        } catch {
          // El producto fue creado; la asociación de proveedor puede hacerse desde la edición
        }
      }

      toast.dismiss(loadingToast)
      toast.success("Producto creado correctamente")
      router.push("/products")
    } catch (error: any) {
      toast.dismiss(loadingToast)
      toast.error(error?.message || "Error creando producto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto -m-6">
      <div className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/products">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Nuevo Producto</h1>
              <p className="text-muted-foreground">Agregar un nuevo producto al catálogo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="bg-transparent" asChild>
              <Link href="/products">Cancelar</Link>
            </Button>
            <Button type="submit" form="new-product-form" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              Guardar Producto
            </Button>
          </div>
        </div>
      </div>

      <form id="new-product-form" onSubmit={handleSubmit} className="p-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
                <CardDescription>Datos básicos del producto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      placeholder="PRO-001"
                      value={formData.sku}
                      onChange={(e) => {
                        setFormData({ ...formData, sku: e.target.value })
                        clearFieldError("sku")
                      }}
                      className={fieldErrors.sku ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {fieldErrors.sku ? <p className="text-sm text-red-600">{fieldErrors.sku}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Código de Barras</Label>
                    <Input
                      id="barcode"
                      placeholder="7501234567890"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Producto *</Label>
                  <Input
                    id="name"
                    placeholder="Nombre del producto"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value })
                      clearFieldError("name")
                    }}
                    className={fieldErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {fieldErrors.name ? <p className="text-sm text-red-600">{fieldErrors.name}</p> : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Producto *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => {
                          setFormData({ ...formData, type: value })
                          clearFieldError("type")
                        }}
                      >
                      <SelectTrigger className={`w-full ${fieldErrors.type ? "border-red-500 ring-red-500" : ""}`}>
                        <SelectValue placeholder="Sin tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {productTypes.map((typeItem: any) => (
                          <SelectItem key={typeItem.id} value={typeItem.name}>
                            {typeItem.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.type ? <p className="text-sm text-red-600">{fieldErrors.type}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría *</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => {
                        setFormData({ ...formData, categoryId: value })
                        clearFieldError("categoryId")
                      }}
                    >
                      <SelectTrigger className={`w-full ${fieldErrors.categoryId ? "border-red-500 ring-red-500" : ""}`}>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category: any) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.categoryId ? <p className="text-sm text-red-600">{fieldErrors.categoryId}</p> : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Descripción detallada del producto"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="unitOfMeasure">Unidad de Medida *</Label>
                    <Input
                      id="unitOfMeasure"
                      placeholder="Pieza, Kg, Litro, etc."
                      value={formData.unitOfMeasure}
                      onChange={(e) => {
                        setFormData({ ...formData, unitOfMeasure: e.target.value })
                        clearFieldError("unitOfMeasure")
                      }}
                      className={fieldErrors.unitOfMeasure ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {fieldErrors.unitOfMeasure ? <p className="text-sm text-red-600">{fieldErrors.unitOfMeasure}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="isActive">Estado del Producto</Label>
                    <Select
                      value={formData.isActive ? "active" : "inactive"}
                      onValueChange={(value) => setFormData({ ...formData, isActive: value === "active" })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-7">
                    <Checkbox
                      id="hasIva16"
                      checked={formData.hasIva16}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasIva16: checked === true })}
                    />
                    <Label htmlFor="hasIva16" className="cursor-pointer">IVA 16%</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            

            <Card>
              <CardHeader>
                <CardTitle>Proveedor</CardTitle>
                <CardDescription>Proveedor preferido para este insumo (opcional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="supplierId">Proveedor</Label>
                    <ComboBox
                      options={suppliers.map((s: any) => ({ value: s.id, label: s.name }))}
                      value={supplierForm.supplierId}
                      onChange={(v) => setSupplierForm({ ...supplierForm, supplierId: v })}
                      placeholder="Sin proveedor (se puede asignar después)"
                      searchPlaceholder="Buscar proveedor..."
                    />
                  </div>
                  {supplierForm.supplierId && (
                    <div className="space-y-2">
                      <Label htmlFor="supplierPrice">Precio del proveedor *</Label>
                      <Input
                        id="supplierPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={supplierForm.price}
                        onChange={(e) => setSupplierForm({ ...supplierForm, price: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuración de Inventario por Almacén</CardTitle>
                <CardDescription>Define los niveles de stock mínimo, máximo, punto de reorden y stock actual para cada almacén</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="warehouseSearch">Buscar Almacén</Label>
                    <Input
                      id="warehouseSearch"
                      placeholder="Buscar por nombre o código..."
                      value={warehouseSearch}
                      onChange={(e) => setWarehouseSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="w-full max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Almacén</TableHead>
                        <TableHead>Stock Actual</TableHead>
                        <TableHead>Stock Mínimo</TableHead>
                        <TableHead>Stock Máximo</TableHead>
                        <TableHead>Punto de Reorden</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredWarehouses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                          No hay almacenes que coincidan con los filtros
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWarehouses.map((warehouse: any) => (
                        <TableRow key={warehouse.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{warehouse.name}</p>
                              <p className="text-xs text-muted-foreground">{warehouse.code}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              inputMode="numeric"
                              className="w-24"
                              placeholder="0"
                              value={warehouseInventory[warehouse.id]?.currentStock || ""}
                              onChange={(e) => {
                                const sanitized = e.target.value.replace(/[^0-9]/g, "")
                                setWarehouseInventory(prev => ({
                                  ...prev,
                                  [warehouse.id]: {
                                    ...(prev[warehouse.id] || { minStock: "", maxStock: "", reorderPoint: "", currentStock: "" }),
                                    currentStock: sanitized
                                  }
                                }))
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              inputMode="numeric"
                              className="w-24"
                              placeholder="0"
                              value={warehouseInventory[warehouse.id]?.minStock || ""}
                              onChange={(e) => {
                                const sanitized = e.target.value.replace(/[^0-9]/g, "")
                                setWarehouseInventory(prev => ({
                                  ...prev,
                                  [warehouse.id]: {
                                    ...(prev[warehouse.id] || { minStock: "", maxStock: "", reorderPoint: "", currentStock: "" }),
                                    minStock: sanitized
                                  }
                                }))
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              inputMode="numeric"
                              className="w-24"
                              placeholder="0"
                              value={warehouseInventory[warehouse.id]?.maxStock || ""}
                              onChange={(e) => {
                                const sanitized = e.target.value.replace(/[^0-9]/g, "")
                                setWarehouseInventory(prev => ({
                                  ...prev,
                                  [warehouse.id]: {
                                    ...(prev[warehouse.id] || { minStock: "", maxStock: "", reorderPoint: "", currentStock: "" }),
                                    maxStock: sanitized
                                  }
                                }))
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              inputMode="numeric"
                              className="w-24"
                              placeholder="0"
                              value={warehouseInventory[warehouse.id]?.reorderPoint || ""}
                              onChange={(e) => {
                                const sanitized = e.target.value.replace(/[^0-9]/g, "")
                                setWarehouseInventory(prev => ({
                                  ...prev,
                                  [warehouse.id]: {
                                    ...(prev[warehouse.id] || { minStock: "", maxStock: "", reorderPoint: "", currentStock: "" }),
                                    reorderPoint: sanitized
                                  }
                                }))
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
      </form>
    </div>
  )
}
