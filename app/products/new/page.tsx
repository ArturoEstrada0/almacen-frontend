"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { useCategories } from "@/lib/hooks/use-categories"
import { ArrowLeft, Save, Upload, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiPost, apiPatch } from "@/lib/db/localApi"
import { toast } from "@/lib/utils/toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface WarehouseInventory {
  warehouseId: string
  minStock: string
  maxStock: string
  currentStock: string
  reorderPoint: string
}

export default function NewProductPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    type: "insumo",
  categoryId: "",
  barcode: "",
    unitOfMeasure: "Pieza",
    costPrice: "",
    salePrice: "",
    isActive: true,
  })

  const { warehouses } = useWarehouses()
  const { categories } = useCategories()

  const [warehouseInventories, setWarehouseInventories] = useState<WarehouseInventory[]>([])

  useEffect(() => {
    if (!warehouses || warehouses.length === 0) return
    setWarehouseInventories(
      warehouses.map((wh: any) => ({ warehouseId: wh.id, minStock: "", maxStock: "", reorderPoint: "", currentStock: "" })),
    )
  }, [warehouses?.length])

  const updateWarehouseInventory = (warehouseId: string, field: keyof WarehouseInventory, value: string) => {
    setWarehouseInventories((prev) => prev.map((inv) => (inv.warehouseId === warehouseId ? { ...inv, [field]: value } : inv)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Map front-end types to backend enum (backend accepts 'insumo' or 'fruta')
    const mappedType = formData.type === "fruta" ? "fruta" : "insumo"

    const payload: any = {
      sku: formData.sku || undefined,
      name: formData.name,
      description: formData.description || undefined,
      type: mappedType,
      categoryId: formData.categoryId || undefined,
      barcode: formData.barcode || undefined,
  // backend expects `unitId` (UUID) if provided. We don't have unitId from free-text input,
  // so omit the free-text `unit` field to avoid validation errors.
      cost: formData.costPrice ? Number(formData.costPrice) : undefined,
      price: formData.salePrice ? Number(formData.salePrice) : undefined,
      active: formData.isActive,
    }

    try {
      toast.loading("Creando producto...")
      const created = await apiPost(`/products`, payload)

      // Persist per-warehouse inventory defaults (min/max/reorder) and create 'ajuste' movements for initial stock
      for (const inv of warehouseInventories) {
        const hasInventorySettings = inv.minStock !== "" || inv.maxStock !== "" || inv.reorderPoint !== ""
        if (hasInventorySettings) {
          try {
            await apiPatch(`/inventory/${(created as any).id}`, {
              warehouseId: inv.warehouseId,
              minStock: inv.minStock !== "" ? Number(inv.minStock) : undefined,
              maxStock: inv.maxStock !== "" ? Number(inv.maxStock) : undefined,
              reorderPoint: inv.reorderPoint !== "" ? Number(inv.reorderPoint) : undefined,
            })
          } catch (cfgErr: any) {
            // If backend doesn't have the exact route yet (404), try the compat route
            const isNotFound = cfgErr?.message?.includes("404") || cfgErr?.message?.includes("Not Found")
            if (isNotFound) {
              try {
                await apiPatch(`/inventory/product/${(created as any).id}`, {
                  warehouseId: inv.warehouseId,
                  minStock: inv.minStock !== "" ? Number(inv.minStock) : undefined,
                  maxStock: inv.maxStock !== "" ? Number(inv.maxStock) : undefined,
                  reorderPoint: inv.reorderPoint !== "" ? Number(inv.reorderPoint) : undefined,
                })
              } catch (compatErr) {
                console.error("Error guardando settings de inventario (compat):", compatErr)
              }
            } else {
              console.error("Error guardando settings de inventario:", cfgErr)
            }
          }
        }

        const qty = Number(inv.currentStock || "0")
        if (qty > 0) {
          try {
            await apiPost(`/inventory/movements`, {
              type: "ajuste",
              warehouseId: inv.warehouseId,
              items: [
                {
                  productId: (created as any).id,
                  quantity: qty,
                },
              ],
            })
          } catch (movErr) {
            // non-fatal: log and continue
            console.error("Error creando movimiento de ajuste:", movErr)
          }
        }
      }

      toast.success("Producto creado correctamente")
      router.push("/products")
    } catch (err: any) {
      console.error("Error creando producto:", err)
      toast.error(err?.message || "Error creando producto")
    }
  }

  const productTypes = [
    { value: "insumo", label: "Insumo" },
    { value: "fruta", label: "Fruta" },
    { value: "agua", label: "Agua" },
    { value: "polvos", label: "Polvos" },
    { value: "materia-prima", label: "Materia Prima" },
    { value: "producto-terminado", label: "Producto Terminado" },
    { value: "empaque", label: "Empaque" },
    { value: "otro", label: "Otro" },
  ]

  return (
    <div className="space-y-6">
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
                      placeholder="PRO-001"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                    />
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
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
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

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Producto *</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {productTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría *</Label>
                    <Select
                      value={formData.categoryId || "none"}
                      onValueChange={(value) => setFormData({ ...formData, categoryId: value === "none" ? "" : value })}
                    >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin categoría</SelectItem>
                          {categories.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitOfMeasure">Unidad de Medida *</Label>
                  <Input
                    id="unitOfMeasure"
                    placeholder="Pieza, Kg, Litro, etc."
                    value={formData.unitOfMeasure}
                    onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Precios</CardTitle>
                <CardDescription>Configuración de precios del producto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="costPrice">Precio de Costo *</Label>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salePrice">Precio de Venta *</Label>
                    <Input
                      id="salePrice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.salePrice}
                      onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuración de Inventario por Almacén</CardTitle>
                <CardDescription>
                  Define los niveles de stock mínimo, máximo y punto de reorden para cada almacén
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-4">
                  <Link href="/warehouses/new">
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Almacén
                    </Button>
                  </Link>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Almacén</TableHead>
                      <TableHead>Stock Mínimo</TableHead>
                      <TableHead>Stock Máximo</TableHead>
                      <TableHead>Punto de Reorden</TableHead>
                      <TableHead>Stock Actual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(warehouses || []).map((warehouse: any) => {
                      const inventory = warehouseInventories.find((inv) => inv.warehouseId === warehouse.id)
                      return (
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
                              placeholder="0"
                              value={inventory?.minStock || ""}
                              onChange={(e) => updateWarehouseInventory(warehouse.id, "minStock", e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              placeholder="0"
                              value={inventory?.maxStock || ""}
                              onChange={(e) => updateWarehouseInventory(warehouse.id, "maxStock", e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              placeholder="0"
                              value={inventory?.reorderPoint || ""}
                              onChange={(e) => updateWarehouseInventory(warehouse.id, "reorderPoint", e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              placeholder="0"
                              value={inventory?.currentStock || ""}
                              onChange={(e) => updateWarehouseInventory(warehouse.id, "currentStock", e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
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
                  <Button type="button" variant="outline" size="sm">
                    Seleccionar Archivo
                  </Button>
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
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Guardar Producto
              </Button>
              <Button type="button" variant="outline" className="w-full bg-transparent" asChild>
                <Link href="/products">Cancelar</Link>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
