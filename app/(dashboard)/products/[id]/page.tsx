"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useProduct, updateProduct, useProductSuppliers, addProductSupplier, updateProductSupplier, removeProductSupplier } from "@/lib/hooks/use-products"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { useInventoryByWarehouse, updateInventoryStock } from "@/lib/hooks/use-inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ComboBox } from "@/components/ui/combobox"
// Use native selects here to avoid runtime update loop from the custom Select component
import { Switch } from "@/components/ui/switch"
import { Save, ArrowLeft, Upload, Plus, Trash2, Star } from "lucide-react"
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
  const { productSuppliers, mutate: mutateSuppliers } = useProductSuppliers(resolvedId)
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
    isActive: true,
  })

  const [newSupplierForm, setNewSupplierForm] = useState({ supplierId: "", price: "", supplierSku: "", leadTimeDays: "", minimumOrder: "", preferred: false })
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [savingSupplier, setSavingSupplier] = useState(false)

  const availableSuppliers = allSuppliers.filter(
    (s: any) => !productSuppliers.some((ps: any) => ps.supplierId === s.id),
  )

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

  const handleAddSupplier = async () => {
    if (!resolvedId || !newSupplierForm.supplierId) {
      toast.error("Selecciona un proveedor")
      return
    }
    if (!newSupplierForm.price || Number(newSupplierForm.price) < 0) {
      toast.error("Ingresa un precio válido")
      return
    }
    setSavingSupplier(true)
    try {
      await addProductSupplier(resolvedId, {
        supplierId: newSupplierForm.supplierId,
        price: Number(newSupplierForm.price),
        supplierSku: newSupplierForm.supplierSku || undefined,
        leadTimeDays: newSupplierForm.leadTimeDays ? Number(newSupplierForm.leadTimeDays) : undefined,
        minimumOrder: newSupplierForm.minimumOrder ? Number(newSupplierForm.minimumOrder) : undefined,
        preferred: newSupplierForm.preferred,
      })
      toast.success("Proveedor asociado correctamente")
      setNewSupplierForm({ supplierId: "", price: "", supplierSku: "", leadTimeDays: "", minimumOrder: "", preferred: false })
      setShowAddSupplier(false)
      mutateSuppliers()
    } catch (err: any) {
      toast.error(err?.message || "Error al asociar proveedor")
    } finally {
      setSavingSupplier(false)
    }
  }

  const handleSetPreferred = async (productSupplierId: string) => {
    if (!resolvedId) return
    try {
      await updateProductSupplier(resolvedId, productSupplierId, { preferred: true })
      toast.success("Proveedor preferido actualizado")
      mutateSuppliers()
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar proveedor preferido")
    }
  }

  const handleRemoveSupplier = async (productSupplierId: string) => {
    if (!resolvedId) return
    try {
      await removeProductSupplier(resolvedId, productSupplierId)
      toast.success("Proveedor desvinculado")
      mutateSuppliers()
    } catch (err: any) {
      toast.error(err?.message || "Error al desvincular proveedor")
    }
  }

  const typeExistsInCatalog = productTypes.some(
    (typeItem: any) => String(typeItem.name || "").trim().toLowerCase() === String(formData?.type || "").trim().toLowerCase(),
  )
  const showLegacyTypeOption = Boolean(formData?.type) && !typeExistsInCatalog

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
    setFormData({
      sku: product.sku || "",
      name: product.name || "",
      description: product.description || "",
      type: String(product.type || ""),
      categoryId: product.categoryId || "",
      barcode: product.barcode || "",
      unitOfMeasure: product.unitOfMeasure || "Pieza",
      isActive: (product as any).isActive !== undefined ? (product as any).isActive : true,
    })
  }, [product?.id])

  useEffect(() => {
    if (!formData.type || !productTypes.length) return

    const matchedType = productTypes.find(
      (typeItem: any) => String(typeItem.name || "").trim().toLowerCase() === String(formData.type || "").trim().toLowerCase(),
    )

    if (matchedType && matchedType.name !== formData.type) {
      setFormData((current: any) => ({ ...current, type: matchedType.name }))
    }
  }, [productTypes, formData.type])

  useEffect(() => {
    if (!formData.categoryId || !catalogCategories.length) return

    const categoryExists = catalogCategories.some((category: any) => String(category.id) === String(formData.categoryId))
    if (!categoryExists) {
      setFormData((current: any) => ({ ...current, categoryId: "" }))
      setFieldErrors((current) => ({
        ...current,
        categoryId: "La categoría anterior ya no existe. Selecciona una categoría válida",
      }))
    }
  }, [catalogCategories, formData.categoryId])

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
        currentStock: existingInventory?.currentStock?.toString() || "0",
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
        active: formData.isActive,
      }
      
      // Actualizar producto base
      await updateProduct(id, payload)
      
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

  if (isLoading) return <div>Cargando producto...</div>
  if (!product) return <div>Producto no encontrado</div>

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
                    <select
                      id="type"
                      className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${fieldErrors.type ? "border-red-500 focus-visible:ring-red-500" : "border-input"}`}
                      value={formData.type}
                      onChange={(e) => {
                        setFormData({ ...formData, type: e.target.value })
                        clearFieldError("type")
                      }}
                    >
                      <option value="">Sin tipo</option>
                      {showLegacyTypeOption ? <option value={formData.type}>{formData.type} (actual)</option> : null}
                      {productTypes.map((typeItem: any) => (
                        <option key={typeItem.id} value={typeItem.name}>
                          {typeItem.name}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.type ? <p className="text-sm text-red-600">{fieldErrors.type}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría *</Label>
                    <select
                      id="category"
                      className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${fieldErrors.categoryId ? "border-red-500 focus-visible:ring-red-500" : "border-input"}`}
                      value={formData.categoryId || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, categoryId: e.target.value })
                        clearFieldError("categoryId")
                      }}
                    >
                      <option value="">Seleccionar categoría</option>
                      {catalogCategories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.categoryId ? <p className="text-sm text-red-600">{fieldErrors.categoryId}</p> : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                </div>
              </CardContent>
            </Card>

            {/* <Card>
              <CardHeader>
                <CardTitle>Precios</CardTitle>
                <CardDescription>Configuración de precios del producto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="costPrice">Precio de Costo *</Label>
                    <Input id="costPrice" type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salePrice">Precio de Venta *</Label>
                    <Input id="salePrice" type="number" step="0.01" value={formData.salePrice} onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card> */}

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
                              step="0.01"
                              className="w-24" 
                              value={warehouseInventory[warehouse.id]?.currentStock || ""}
                              onChange={(e) => updateWarehouseInventory(warehouse.id, "currentStock", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              step="0.01"
                              className="w-24" 
                              value={warehouseInventory[warehouse.id]?.minStock || ""}
                              onChange={(e) => updateWarehouseInventory(warehouse.id, "minStock", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              step="0.01"
                              className="w-24" 
                              value={warehouseInventory[warehouse.id]?.maxStock || ""}
                              onChange={(e) => updateWarehouseInventory(warehouse.id, "maxStock", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              step="0.01"
                              className="w-24" 
                              value={warehouseInventory[warehouse.id]?.reorderPoint || ""}
                              onChange={(e) => updateWarehouseInventory(warehouse.id, "reorderPoint", e.target.value)}
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
            {/* Proveedores */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Proveedores</CardTitle>
                    <CardDescription>Proveedores que suministran este insumo</CardDescription>
                  </div>
                  {!showAddSupplier && availableSuppliers.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAddSupplier(true)}>
                      <Plus className="mr-2 h-4 w-4" />Asociar Proveedor
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showAddSupplier && (
                  <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                    <p className="text-sm font-medium">Nuevo proveedor</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Proveedor *</Label>
                        <ComboBox
                          options={availableSuppliers.map((s: any) => ({ value: s.id, label: s.name }))}
                          value={newSupplierForm.supplierId}
                          onChange={(v) => setNewSupplierForm({ ...newSupplierForm, supplierId: v })}
                          placeholder="Seleccionar..."
                          searchPlaceholder="Buscar proveedor..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Precio unitario *</Label>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" value={newSupplierForm.price} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, price: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>SKU del proveedor</Label>
                        <Input placeholder="SKU interno" value={newSupplierForm.supplierSku} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, supplierSku: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Días de entrega</Label>
                        <Input type="number" min="0" placeholder="0" value={newSupplierForm.leadTimeDays} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, leadTimeDays: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Pedido mínimo</Label>
                        <Input type="number" min="0" step="0.01" placeholder="1" value={newSupplierForm.minimumOrder} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, minimumOrder: e.target.value })} />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <Switch checked={newSupplierForm.preferred} onCheckedChange={(v) => setNewSupplierForm({ ...newSupplierForm, preferred: v })} id="preferred-new" />
                        <Label htmlFor="preferred-new">Proveedor preferido</Label>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button type="button" size="sm" onClick={handleAddSupplier} disabled={savingSupplier}>
                        {savingSupplier ? "Guardando..." : "Guardar"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddSupplier(false); setNewSupplierForm({ supplierId: "", price: "", supplierSku: "", leadTimeDays: "", minimumOrder: "", preferred: false }) }}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {productSuppliers.length === 0 && !showAddSupplier ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sin proveedores asociados. Usa "Asociar Proveedor" para vincular uno.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>SKU Prov.</TableHead>
                        <TableHead>Entrega (días)</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productSuppliers.map((ps: any) => (
                        <TableRow key={ps.id}>
                          <TableCell className="font-medium">{ps.supplier?.name || ps.supplierId}</TableCell>
                          <TableCell>${Number(ps.price).toFixed(2)}</TableCell>
                          <TableCell className="text-muted-foreground">{ps.supplierSku || "—"}</TableCell>
                          <TableCell>{ps.leadTimeDays ?? 0}</TableCell>
                          <TableCell>
                            {ps.preferred
                              ? <Badge className="gap-1"><Star className="h-3 w-3" />Preferido</Badge>
                              : <Badge variant="secondary">Alternativo</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {!ps.preferred && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleSetPreferred(ps.id)} title="Marcar como preferido">
                                  <Star className="h-4 w-4" />
                                </Button>
                              )}
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveSupplier(ps.id)} title="Desvincular proveedor" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Imagen del Producto</CardTitle>
                <CardDescription>Sube una imagen del producto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center">
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">Arrastra una imagen o haz clic para seleccionar</p>
                  <Button type="button" variant="outline" size="sm">Seleccionar Archivo</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
                <CardDescription>Configuración de disponibilidad</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive">Producto Activo</Label>
                    <p className="text-sm text-muted-foreground">El producto estará disponible en el sistema</p>
                  </div>
                  <Switch id="isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
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
    </div>
  )
}
