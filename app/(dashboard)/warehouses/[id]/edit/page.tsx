 "use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import { updateWarehouse, useWarehouse, useWarehouses } from "@/lib/hooks/use-warehouses"
import { toast } from "@/lib/utils/toast"

export default function EditWarehousePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id || ""

  const { warehouse, isLoading } = useWarehouse(id)
  const { mutate } = useWarehouses()

  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "insumo" as "insumo" | "fruta",
    address: "",
    description: "",
    isActive: true,
  })

  useEffect(() => {
    if (!warehouse) return

    const nextForm = {
      name: warehouse.name || "",
      code: warehouse.code || "",
      type: (warehouse.type as "insumo" | "fruta") || "insumo",
      address: (warehouse as any).address || warehouse.location || "",
      description: warehouse.description || "",
      isActive: (warehouse as any).isActive !== undefined ? Boolean((warehouse as any).isActive) : Boolean((warehouse as any).active),
    }

    setForm((prev) => {
      if (
        prev.name === nextForm.name &&
        prev.code === nextForm.code &&
        prev.type === nextForm.type &&
        prev.address === nextForm.address &&
        prev.description === nextForm.description &&
        prev.isActive === nextForm.isActive
      ) {
        return prev
      }

      return nextForm
    })
  }, [warehouse])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Nombre y código son obligatorios")
      return
    }

    try {
      toast.loading("Actualizando almacén...")
      await updateWarehouse(id, {
        name: form.name,
        code: form.code,
        type: form.type,
        address: form.address || undefined,
        description: form.description || undefined,
        active: form.isActive,
      } as any)
      await mutate()
      toast.success("Almacén actualizado")
      router.push("/inventory")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Error actualizando almacén")
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando almacén...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Almacén</h1>
          <p className="text-muted-foreground">Actualiza la información del almacén</p>
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
                  Guardar Cambios
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/inventory">Cancelar</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
