"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Save } from "lucide-react"
import { apiPost } from "@/lib/db/localApi"
import { createWarehouse, useWarehouses } from "@/lib/hooks/use-warehouses"
import { toast } from "@/lib/utils/toast"

export default function NewWarehousePage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", code: "", address: "", description: "", isActive: true })
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
        address: form.address || undefined,
        description: form.description || undefined,
        isActive: form.isActive,
      })
      toast.success("Almacén creado")
      // refresh list
      mutate()
      router.push("/warehouses")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Error creando almacén")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/warehouses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Almacén</h1>
          <p className="text-muted-foreground">Crear un nuevo almacén</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Detalles</CardTitle>
                <CardDescription>Información básica del almacén</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Ubicación</Label>
                  <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
                <CardDescription>Guardar o cancelar</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button type="submit" className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Crear Almacén
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/warehouses">Cancelar</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
