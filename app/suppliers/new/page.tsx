"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Save, ArrowLeft } from "lucide-react"
import { apiPost } from "@/lib/db/localApi"
import { toast } from "@/lib/utils/toast"

export default function NewSupplierPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    code: "",
    name: "",
    taxId: "",
    email: "",
    phone: "",
    address: "",
    contactName: "",
    businessType: "",
    creditDays: "30",
    isActive: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim() || !form.taxId.trim()) {
      toast.error("Los campos 'Nombre' y 'RFC/Tax ID' son obligatorios")
      return
    }

    try {
      toast.loading("Creando proveedor...")
      await apiPost(`/suppliers`, {
        code: form.code || `SUP-${Date.now()}`,
        name: form.name,
        taxId: form.taxId,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        contactName: form.contactName || undefined,
        businessType: form.businessType || undefined,
        creditDays: form.creditDays ? Number(form.creditDays) : undefined,
        isActive: form.isActive,
      })
      toast.success("Proveedor creado")
      router.push("/suppliers")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Error creando proveedor")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/suppliers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Proveedor</h1>
          <p className="text-muted-foreground">Agregar un proveedor al catálogo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información</CardTitle>
                <CardDescription>Datos básicos del proveedor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="PROV-001" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre / Razón Social *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">RFC / Tax ID *</Label>
                  <Input id="taxId" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} required />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contacto</Label>
                    <Input id="contactName" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessType">Giro</Label>
                    <Input id="businessType" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditDays">Días de Crédito</Label>
                  <Input id="creditDays" type="number" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
                <CardDescription>Guardar o cancelar</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button type="submit" className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Crear Proveedor
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/suppliers">Cancelar</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
