"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiPost } from "@/lib/db/localApi"
import { toast } from "@/lib/utils/toast"
import { useCategories } from "@/lib/hooks/use-categories"
import { useProductTypes } from "@/lib/hooks/use-product-types"

export default function NewProductPage() {
  const router = useRouter()
  const { categories } = useCategories()
  const { productTypes } = useProductTypes()
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    type: "",
    categoryId: "",
    barcode: "",
    unitOfMeasure: "Pieza",
    costPrice: "",
    salePrice: "",
    isActive: true,
  })

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
        cost: formData.costPrice ? Number(formData.costPrice) : undefined,
        price: formData.salePrice ? Number(formData.salePrice) : undefined,
        active: formData.isActive,
      }

      await apiPost("/products", payload)
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
                    <Label htmlFor="costPrice">Precio de Costo</Label>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salePrice">Precio de Venta</Label>
                    <Input
                      id="salePrice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.salePrice}
                      onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                    />
                  </div>
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
                <div className="space-y-2">
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
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={loading}>
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
