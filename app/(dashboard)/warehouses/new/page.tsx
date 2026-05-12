"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import { createWarehouse, useWarehouses } from "@/lib/hooks/use-warehouses"
import { toast } from "@/lib/utils/toast"

export default function NewWarehousePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "insumo" as "insumo" | "fruta",
    address: "",
    description: "",
    isActive: true,
  })
  const { mutate } = useWarehouses()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Nombre y código son obligatorios")
      return
    }

    try {
      toast.loading("Creando almacén...")
      await createWarehouse({
        name: form.name,
        code: form.code,
        type: form.type,
        address: form.address || undefined,
        description: form.description || undefined,
        active: form.isActive,
      })
      toast.success("Almacén creado")
      // refresh list
      mutate()
      router.push("/inventory")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Error creando almacén")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inventory">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nuevo Almacén</h1>
            <p className="text-muted-foreground">Crear un nuevo almacén</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/inventory">Cancelar</Link>
          </Button>
          <Button type="submit" form="new-warehouse-form">
            <Save className="mr-2 h-4 w-4" />
            Crear Almacén
          </Button>
        </div>
      </div>

      <form id="new-warehouse-form" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
            <CardDescription>Información básica del almacén</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select value={form.type} onValueChange={(value: "insumo" | "fruta") => setForm({ ...form, type: value })}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fruta">Fruta</SelectItem>
                    <SelectItem value="insumo">Insumo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Ubicación</Label>
                <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={5}
                  className="min-h-[140px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
