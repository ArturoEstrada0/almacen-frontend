"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useProduct, updateProduct, addProductSupplier, useProductSuppliers, removeProductSupplier } from "@/lib/hooks/use-products"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { useInventoryByWarehouse, updateInventoryStock } from "@/lib/hooks/use-inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ComboBox } from "@/components/ui/combobox"
// Use native selects here to avoid runtime update loop from the custom Select component
import { Save, ArrowLeft, Plus, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/lib/utils/toast"
import { useCategories } from "@/lib/hooks/use-categories"
import { useProductTypes } from "@/lib/hooks/use-product-types"

interface Params {
  params: any
}

export default function EditProductPage({ params }: Params) {
  const router = useRouter()

  const [resolvedId, setResolvedId] = useState<string | null>(null)
  useEffect(() => {
    if (!params) return
    // params can be a Promise in this Next.js version
    if (typeof (params as any)?.then === "function") {
      ;(params as any).then((p: any) => setResolvedId(p.id))
    } else {
      setResolvedId((params as any).id)
    }
  }, [params])

  const routerRef = router
  const { product, isLoading, mutate } = useProduct(resolvedId ?? null)
  const { suppliers: allSuppliers } = useSuppliers()
  const { warehouses } = useWarehouses()
  const { inventory } = useInventoryByWarehouse(null)
  const { categories: catalogCategories } = useCategories()
  const { productTypes } = useProductTypes()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [warehouseSearch, setWarehouseSearch] = useState("")
  const [formData, setFormData] = useState<any>({
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

  const [pendingSuppliers, setPendingSuppliers] = useState<{ supplierId: string; price: string; supplierSku: string; leadTimeDays: string; minimumOrder: string; preferred: boolean }[]>([])

  const { productSuppliers, mutate: mutateSuppliers } = useProductSuppliers(resolvedId)

  const addPendingSupplier = () => {
    setPendingSuppliers(prev => [...prev, { supplierId: "", price: "", supplierSku: "", leadTimeDays: "", minimumOrder: "", preferred: false }])
  }

  const removePendingSupplier = (index: number) => {
    setPendingSuppliers(prev => prev.filter((_, i) => i !== index))
  }

  const updatePendingSupplier = (index: number, field: string, value: any) => {
    setPendingSuppliers(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const [supplierToDelete, setSupplierToDelete] = useState<{ id: string; name: string } | null>(null)

  const confirmRemoveSupplier = async () => {
    if (!resolvedId || !supplierToDelete) return
    try {
      await removeProductSupplier(resolvedId, supplierToDelete.id)
      mutateSuppliers()
      toast.success("Proveedor eliminado")
    } catch {
      toast.error("Error eliminando proveedor")
    } finally {
      setSupplierToDelete(null)
    }
  }

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

  

  const typeExistsInCatalog = productTypes.some(
    (typeItem: any) => String(typeItem.name || "").trim().toLowerCase() === String(formData?.type || "").trim().toLowerCase(),
  )
  const showLegacyTypeOption = Boolean(formData?.type) && !typeExistsInCatalog

  const categoryOptions = useMemo(() => {
    const options = [...(catalogCategories || [])]
    const productCategory: any = (product as any)?.category
    const productCategoryId = (product as any)?.categoryId || productCategory?.id
    const productCategoryName = typeof productCategory === "string" ? productCategory : productCategory?.name

    if (
      productCategoryName &&
      !options.some(
        (category: any) =>
          String(category.id) === String(productCategoryId || "") ||
          String(category.name || "").trim().toLowerCase() === String(productCategoryName || "").trim().toLowerCase(),
      )
    ) {
      options.unshift({
        id: String(productCategoryId || `legacy-${String(productCategoryName).trim().toLowerCase()}`),
        name: String(productCategoryName),
      })
    }
    return options
  }, [catalogCategories, product?.category, product?.categoryId])

  // Estado para configuración de inventario por almacén
  const [warehouseInventory, setWarehouseInventory] = useState<Record<string, {
    minStock: string
    maxStock: string
    reorderPoint: string
    currentStock: string
  }>>({})
  const [initialWarehouseInventory, setInitialWarehouseInventory] = useState<Record<string, {
    minStock: string
    maxStock: string
    reorderPoint: string
    currentStock: string
  }>>({})

  const clearFieldError = (field: string) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  useEffect(() => {
    if (!product) return
    // only initialize when the product id changes to avoid repeated resets from unstable object references
    const newFormData = {
      sku: product.sku || "",
      name: product.name || "",
      description: product.description || "",
      type: product.type ? String(product.type) : "",
      categoryId: product.categoryId || product.category?.id || "",
      barcode: product.barcode || "",
      unitOfMeasure: product.unitOfMeasure || "Pieza",
      hasIva16: (product as any).hasIva16 !== undefined ? Boolean((product as any).hasIva16) : true,
      isActive: (product as any).isActive !== undefined ? (product as any).isActive : true,
    }
    console.log('📥 [Edit] Producto cargado:', { id: product.id, hasIva16: newFormData.hasIva16, categoryId: newFormData.categoryId })
    setFormData(newFormData)
  }, [product?.id])

  useEffect(() => {
    if (!product) return
    if (formData.categoryId) return

    const productCategory: any = (product as any)?.category
    const productCategoryName = typeof productCategory === "string" ? productCategory : productCategory?.name
    if (!productCategoryName) return

    const matchedCategory = (catalogCategories || []).find(
      (category: any) =>
        String(category.name || "").trim().toLowerCase() === String(productCategoryName).trim().toLowerCase(),
    )

    if (matchedCategory?.id) {
      setFormData((current: any) => {
        if (current.categoryId) return current
        return { ...current, categoryId: String(matchedCategory.id) }
      })
    }
  }, [product?.id, product?.category, catalogCategories, formData.categoryId])

  // Cargar inventario existente cuando se cargan los datos
  useEffect(() => {
    if (!resolvedId || !inventory.length || !warehouses.length) return
    
    const inventoryByWarehouse: Record<string, any> = {}
    warehouses.forEach((warehouse: any) => {
      const existingInventory = inventory.find(
        (inv: any) => inv.productId === resolvedId && inv.warehouseId === warehouse.id
      )

      inventoryByWarehouse[warehouse.id] = {
        minStock: existingInventory?.minStock?.toString() || "",
        maxStock: existingInventory?.maxStock?.toString() || "",
        reorderPoint: existingInventory?.reorderPoint?.toString() || "",
        currentStock: existingInventory?.currentStock?.toString() || "",
      }
    })
    
    setWarehouseInventory(inventoryByWarehouse)
    setInitialWarehouseInventory(inventoryByWarehouse)
  }, [resolvedId, inventory, warehouses])

  const isSameInventoryValue = (left?: string, right?: string) => String(left ?? "").trim() === String(right ?? "").trim()

  const hasInventoryRowChanges = (warehouseId: string) => {
    const current = warehouseInventory[warehouseId]
    const initial = initialWarehouseInventory[warehouseId]

    if (!current || !initial) return false

    return (
      !isSameInventoryValue(current.currentStock, initial.currentStock) ||
      !isSameInventoryValue(current.minStock, initial.minStock) ||
      !isSameInventoryValue(current.maxStock, initial.maxStock) ||
      !isSameInventoryValue(current.reorderPoint, initial.reorderPoint)
    )
  }

  const updateWarehouseInventory = (warehouseId: string, field: string, value: string) => {
    setWarehouseInventory(prev => ({
      ...prev,
      [warehouseId]: {
        ...prev[warehouseId],
        [field]: value,
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const nextErrors: Record<string, string> = {}
    if (!formData.sku?.trim()) nextErrors.sku = "El SKU es obligatorio"
    if (!formData.name?.trim()) nextErrors.name = "El nombre es obligatorio"
    if (!formData.type) nextErrors.type = "Selecciona un tipo de producto"
    if (!formData.categoryId) nextErrors.categoryId = "Selecciona una categoría"

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      toast.error("Completa los campos marcados")
      return
    }

    setFieldErrors({})
    
    const loadingToast = toast.loading("Actualizando producto...")
    
    try {
      // use resolvedId (unwrapped) to avoid Next.js params Promise warning
      const id = resolvedId
      if (!id) throw new Error("Product id no resuelto")

      const payload: any = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description,
        type: formData.type,
        categoryId: formData.categoryId,
        barcode: formData.barcode || undefined,
        hasIva16: formData.hasIva16,
        active: formData.isActive,
      }
      console.log('📤 [handleSubmit] Payload enviado:', { hasIva16: payload.hasIva16, categoryId: payload.categoryId, sku: payload.sku })
      
      // Actualizar producto base
      const response = await updateProduct(id, payload)
      console.log('✅ [handleSubmit] Respuesta del servidor:', { id: response?.id, hasIva16: response?.hasIva16, categoryId: response?.categoryId })
      
      // Actualizar inventario por almacén
      for (const warehouseId in warehouseInventory) {
        const invData = warehouseInventory[warehouseId]

        // Solo actualizar si el usuario cambió esta fila
        if (hasInventoryRowChanges(warehouseId)) {
          await updateInventoryStock({
            productId: id,
            warehouseId,
            quantity: invData.currentStock !== "" ? Number(invData.currentStock) : undefined,
            minStock: invData.minStock !== "" ? Number(invData.minStock) : undefined,
            maxStock: invData.maxStock !== "" ? Number(invData.maxStock) : undefined,
            reorderPoint: invData.reorderPoint !== "" ? Number(invData.reorderPoint) : undefined,
          })
        }
      }
      
      // Add all pending suppliers
      for (const ps of pendingSuppliers) {
        if (ps.supplierId) {
          try {
            await addProductSupplier(id, {
              supplierId: ps.supplierId,
              price: ps.price ? Number(ps.price) : 0,
              preferred: ps.preferred,
              supplierSku: ps.supplierSku || undefined,
              leadTimeDays: ps.leadTimeDays ? Number(ps.leadTimeDays) : undefined,
              minimumOrder: ps.minimumOrder ? Number(ps.minimumOrder) : undefined,
            })
          } catch (err) {
            console.error("Error asociando proveedor", err)
          }
        }
      }
      mutateSuppliers()

      toast.dismiss(loadingToast)
      toast.success("Producto actualizado")
      mutate()
      router.push("/products")
    } catch (err: any) {
      toast.dismiss(loadingToast)
      console.error(err)
      toast.error(err?.message || "Error actualizando producto")
    }
  }

  if (isLoading || !resolvedId) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <p className="text-muted-foreground text-sm">Cargando producto...</p>
    </div>
  )
  if (!product) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-muted-foreground">Producto no encontrado</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Producto</h1>
          <p className="text-muted-foreground">Editar producto existente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
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
                    <Input id="barcode" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Producto *</Label>
                  <Input
                    id="name"
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
                      key={`type-${formData.type || "none"}-${productTypes.length > 0 ? "loaded" : "empty"}`}
                      value={formData.type || undefined}
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
                        {showLegacyTypeOption && (
                          <SelectItem value={formData.type}>
                            {formData.type} (no disponible)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {fieldErrors.type ? <p className="text-sm text-red-600">{fieldErrors.type}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría *</Label>
                    <Select
                      value={formData.categoryId || undefined}
                      onValueChange={(value) => {
                        setFormData({ ...formData, categoryId: value })
                        clearFieldError("categoryId")
                      }}
                    >
                      <SelectTrigger className={`w-full ${fieldErrors.categoryId ? "border-red-500 ring-red-500" : ""}`}>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((category: any) => (
                          <SelectItem key={category.id} value={String(category.id)}>
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
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitOfMeasure">Unidad de Medida *</Label>
                  <Input
                    id="unitOfMeasure"
                    placeholder="Pieza, Kg, Litro, etc."
                    value={formData.unitOfMeasure}
                    onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proveedores</CardTitle>
                <CardDescription>Proveedores asociados a este producto (opcional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
                  {/* Existing suppliers */}
                  {productSuppliers.map((ps: any) => {
                    const supplierName = ps.supplier?.name || allSuppliers.find((s: any) => s.id === ps.supplierId)?.name || ps.supplierId
                    return (
                      <div key={ps.id} className="flex items-center gap-3 rounded-md border p-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{supplierName}</p>
                          {ps.preferred && <p className="text-xs text-muted-foreground">Preferido</p>}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:text-destructive"
                          onClick={() => setSupplierToDelete({ id: ps.id, name: supplierName })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}

                  {/* Pending new suppliers */}
                  {pendingSuppliers.map((ps, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-md border border-dashed p-3">
                      <div className="flex-1">
                        <Label className="mb-1 block">Proveedor</Label>
                        <ComboBox
                          options={allSuppliers.map((s: any) => ({ value: s.id, label: s.name }))}
                          value={ps.supplierId}
                          onChange={(v) => updatePendingSupplier(index, "supplierId", v)}
                          placeholder="Seleccionar proveedor..."
                          searchPlaceholder="Buscar proveedor..."
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 mt-5 text-destructive hover:text-destructive"
                        onClick={() => removePendingSupplier(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button type="button" variant="outline" size="sm" onClick={addPendingSupplier} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar proveedor
                </Button>
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
                              onChange={(e) => updateWarehouseInventory(warehouse.id, "currentStock", e.target.value.replace(/[^0-9]/g, ""))}
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
                              onChange={(e) => updateWarehouseInventory(warehouse.id, "minStock", e.target.value.replace(/[^0-9]/g, ""))}
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
                              onChange={(e) => updateWarehouseInventory(warehouse.id, "maxStock", e.target.value.replace(/[^0-9]/g, ""))}
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
                              onChange={(e) => updateWarehouseInventory(warehouse.id, "reorderPoint", e.target.value.replace(/[^0-9]/g, ""))}
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
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
                <CardDescription>Configuración de disponibilidad</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label htmlFor="isActive">Producto Activo</Label>
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

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="hasIva16"
                    checked={formData.hasIva16}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasIva16: checked === true })}
                  />
                  <Label htmlFor="hasIva16" className="cursor-pointer">IVA 16%</Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full"><Save className="mr-2 h-4 w-4" />Guardar Cambios</Button>
              <Button type="button" variant="outline" className="w-full bg-transparent" asChild><Link href="/products">Cancelar</Link></Button>
            </div>
          </div>
        </div>
      </form>

      <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => { if (!open) setSupplierToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la asociación con <strong>{supplierToDelete?.name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveSupplier} className="bg-red-600 text-white hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
