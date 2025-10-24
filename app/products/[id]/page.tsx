"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useProduct, updateProduct } from "@/lib/hooks/use-products"
import { useCategories } from "@/lib/hooks/use-categories"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
// Use native selects here to avoid runtime update loop from the custom Select component
import { Switch } from "@/components/ui/switch"
import { Save, ArrowLeft, Upload } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/lib/utils/toast"

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
  const { categories } = useCategories()
  const { warehouses } = useWarehouses()

  const [formData, setFormData] = useState<any>({
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

  useEffect(() => {
    if (!product) return
    // only initialize when the product id changes to avoid repeated resets from unstable object references
    setFormData({
      sku: product.sku || "",
      name: product.name || "",
      description: product.description || "",
      type: product.type || "insumo",
      categoryId: product.categoryId || "",
      barcode: product.barcode || "",
      unitOfMeasure: product.unitOfMeasure || "Pieza",
      costPrice: (product as any).costPrice?.toString() || "",
      salePrice: (product as any).salePrice?.toString() || "",
      isActive: (product as any).isActive !== undefined ? (product as any).isActive : true,
    })
  }, [product?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      toast.loading("Actualizando producto...")
      // use resolvedId (unwrapped) to avoid Next.js params Promise warning
      const id = resolvedId
      if (!id) throw new Error("Product id no resuelto")

      const payload: any = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description,
        type: formData.type,
        categoryId: formData.categoryId || undefined,
        barcode: formData.barcode || undefined,
        // backend DTO uses `unitId` and `active` fields. We don't have unitId selected yet,
        // so omit unit-related field. Map costPrice/salePrice to cost/price in hook.
        costPrice: formData.costPrice ? Number(formData.costPrice) : undefined,
        salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
        active: formData.isActive,
      }
      await updateProduct(id, payload)
      toast.success("Producto actualizado")
      mutate()
      router.push("/products")
    } catch (err: any) {
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
                    <Input id="sku" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Código de Barras</Label>
                    <Input id="barcode" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Producto *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Producto *</Label>
                    <select id="type" className="input" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                      <option value="insumo">Insumo</option>
                      <option value="fruta">Fruta</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría *</Label>
                    <select id="category" className="input" value={formData.categoryId || ""} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}>
                      <option value="">Sin categoría</option>
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
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
                    <Input id="costPrice" type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salePrice">Precio de Venta *</Label>
                    <Input id="salePrice" type="number" step="0.01" value={formData.salePrice} onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuración de Inventario por Almacén</CardTitle>
                <CardDescription>Define los niveles de stock mínimo, máximo y punto de reorden para cada almacén</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Almacén</TableHead>
                      <TableHead>Stock Mínimo</TableHead>
                      <TableHead>Stock Máximo</TableHead>
                      <TableHead>Punto de Reorden</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(warehouses || []).map((warehouse: any) => (
                      <TableRow key={warehouse.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{warehouse.name}</p>
                            <p className="text-xs text-muted-foreground">{warehouse.code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input className="w-24" />
                        </TableCell>
                        <TableCell>
                          <Input className="w-24" />
                        </TableCell>
                        <TableCell>
                          <Input className="w-24" />
                        </TableCell>
                      </TableRow>
                    ))}
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
