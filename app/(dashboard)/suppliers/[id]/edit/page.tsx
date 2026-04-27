"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Save, ArrowLeft, Building2, Package } from "lucide-react"
import { updateSupplier, useSupplier } from "@/lib/hooks/use-suppliers"
import { toast } from "@/lib/utils/toast"
import { SUPPLIER_TYPE_OPTIONS } from "@/lib/constants/supplier-types"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import useSWR from "swr"

function useSupplierProducts(supplierId: string | undefined) {
  const { data, error, isLoading } = useSWR<any[]>(
    supplierId ? `supplier-products-${supplierId}` : null,
    () => ApiClient.get<any[]>(API_ENDPOINTS.suppliers.products(supplierId as string)),
  )
  return { supplierProducts: data || [], isLoading, isError: error }
}

export default function EditSupplierPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supplierId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { supplier, isLoading } = useSupplier(supplierId || "")
  const { supplierProducts, isLoading: loadingProducts } = useSupplierProducts(supplierId)

  const [form, setForm] = useState({
    code: "",
    name: "",
    taxId: "",
    email: "",
    phone: "",
    address: "",
    contactName: "",
    businessType: "",
    supplierType: "",
    creditDays: "",
    isActive: true,
    bankNameMxn: "",
    accountNumberMxn: "",
    clabeMxn: "",
    bankNameUsd: "",
    accountNumberUsd: "",
    swiftCodeUsd: "",
  })

  useEffect(() => {
    if (!supplier) return

    setForm({
      code: supplier.code || "",
      name: supplier.name || "",
      taxId: supplier.rfc || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      contactName: supplier.contactName || "",
      businessType: supplier.businessType || "",
      supplierType: supplier.supplierType || "",
      creditDays: supplier.paymentTerms?.toString?.() || "",
      isActive: supplier.active ?? true,
      bankNameMxn: (supplier as any).bankNameMxn || "",
      accountNumberMxn: (supplier as any).accountNumberMxn || "",
      clabeMxn: (supplier as any).clabeMxn || "",
      bankNameUsd: (supplier as any).bankNameUsd || "",
      accountNumberUsd: (supplier as any).accountNumberUsd || "",
      swiftCodeUsd: (supplier as any).swiftCodeUsd || "",
    })
  }, [supplier?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!supplierId) {
      toast.error("No se pudo identificar el proveedor")
      return
    }

    if (!form.name.trim() || !form.taxId.trim() || !form.supplierType.trim()) {
      toast.error("Los campos 'Nombre', 'RFC/Tax ID' y 'Tipo de proveedor' son obligatorios")
      return
    }

    let loadingId: string | number | undefined
    try {
      loadingId = toast.loading("Actualizando proveedor...")
      const payload: any = {
        code: form.code,
        name: form.name,
        taxId: form.taxId,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        contactName: form.contactName || undefined,
        businessType: form.businessType || undefined,
        supplierType: form.supplierType,
        creditDays: form.creditDays ? Number(form.creditDays) : undefined,
        isActive: form.isActive,
        bankNameMxn: form.bankNameMxn || undefined,
        accountNumberMxn: form.accountNumberMxn || undefined,
        clabeMxn: form.clabeMxn || undefined,
        bankNameUsd: form.bankNameUsd || undefined,
        accountNumberUsd: form.accountNumberUsd || undefined,
        swiftCodeUsd: form.swiftCodeUsd || undefined,
      }

      await updateSupplier(supplierId, payload)
      if (loadingId) toast.dismiss(loadingId)
      toast.success("Proveedor actualizado")
      router.push("/suppliers")
    } catch (err: any) {
      if (loadingId) toast.dismiss(loadingId)
      const message = err?.message || (err?.statusCode ? `Error ${err.statusCode}` : "Error actualizando proveedor")
      toast.error(message)
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
          <h1 className="text-3xl font-bold tracking-tight">Editar Proveedor</h1>
          <p className="text-muted-foreground">{supplier?.name || "Cargando..."}</p>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="info" className="gap-2">
            <Building2 className="h-4 w-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Productos
            {supplierProducts.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{supplierProducts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Información ── */}
        <TabsContent value="info">
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
                        <Label htmlFor="supplierType">Tipo de proveedor *</Label>
                        <Select value={form.supplierType} onValueChange={(value) => setForm({ ...form, supplierType: value })}>
                          <SelectTrigger id="supplierType">
                            <SelectValue placeholder="Selecciona un tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPLIER_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

                <Card>
                  <CardHeader>
                    <CardTitle>Cuenta Bancaria - Pesos (MXN)</CardTitle>
                    <CardDescription>Información para pagos en pesos mexicanos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankNameMxn">Banco</Label>
                      <Input id="bankNameMxn" value={form.bankNameMxn} onChange={(e) => setForm({ ...form, bankNameMxn: e.target.value })} placeholder="BBVA, Banamex, Santander, etc." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumberMxn">Número de Cuenta</Label>
                      <Input id="accountNumberMxn" value={form.accountNumberMxn} onChange={(e) => setForm({ ...form, accountNumberMxn: e.target.value })} placeholder="1234567890" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clabeMxn">CLABE Interbancaria</Label>
                      <Input id="clabeMxn" value={form.clabeMxn} onChange={(e) => setForm({ ...form, clabeMxn: e.target.value })} placeholder="012345678901234567" maxLength={18} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cuenta Bancaria - Dólares (USD)</CardTitle>
                    <CardDescription>Información para pagos en dólares</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankNameUsd">Banco</Label>
                      <Input id="bankNameUsd" value={form.bankNameUsd} onChange={(e) => setForm({ ...form, bankNameUsd: e.target.value })} placeholder="Bank of America, Citibank, etc." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumberUsd">Número de Cuenta</Label>
                      <Input id="accountNumberUsd" value={form.accountNumberUsd} onChange={(e) => setForm({ ...form, accountNumberUsd: e.target.value })} placeholder="9876543210" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="swiftCodeUsd">Código SWIFT</Label>
                      <Input id="swiftCodeUsd" value={form.swiftCodeUsd} onChange={(e) => setForm({ ...form, swiftCodeUsd: e.target.value })} placeholder="BOFAUS3N" maxLength={11} />
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
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/suppliers">Cancelar</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </TabsContent>

        {/* ── Tab: Productos ── */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Productos asociados</CardTitle>
              <CardDescription>
                {loadingProducts
                  ? "Cargando productos..."
                  : `${supplierProducts.length} producto${supplierProducts.length !== 1 ? "s" : ""} suministrado${supplierProducts.length !== 1 ? "s" : ""} por este proveedor`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
              ) : supplierProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Este proveedor no tiene productos asociados. Puedes vincularlos desde la edición de cada producto.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio prov.</TableHead>
                      <TableHead>SKU prov.</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierProducts.map((ps: any) => (
                      <TableRow key={ps.id}>
                        <TableCell className="font-mono text-sm">{ps.product?.sku || "—"}</TableCell>
                        <TableCell>
                          <Link href={`/products/${ps.product?.id}/edit`} className="font-medium hover:underline">
                            {ps.product?.name || ps.productId}
                          </Link>
                          <p className="text-xs text-muted-foreground">{ps.product?.type}</p>
                        </TableCell>
                        <TableCell>{ps.product?.category?.name || "—"}</TableCell>
                        <TableCell>${Number(ps.price).toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">{ps.supplierSku || "—"}</TableCell>
                        <TableCell>{ps.leadTimeDays ?? 0} días</TableCell>
                        <TableCell>
                          {ps.preferred
                            ? <Badge className="text-xs">Preferido</Badge>
                            : <Badge variant="secondary" className="text-xs">Alternativo</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
