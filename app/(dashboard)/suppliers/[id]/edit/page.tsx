"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ComboBox } from "@/components/ui/combobox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Save, ArrowLeft, Building2, Package, Plus, Trash2 } from "lucide-react"
import { updateSupplier, useSupplier } from "@/lib/hooks/use-suppliers"
import { useProductsByType, addProductSupplier } from "@/lib/hooks/use-products"
import { toast } from "@/lib/utils/toast"
import { SUPPLIER_TYPE_OPTIONS } from "@/lib/constants/supplier-types"
import { API_ENDPOINTS, ApiClient } from "@/lib/config/api"
import useSWR from "swr"

function useSupplierProducts(supplierId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<any[]>(
    supplierId ? `supplier-products-${supplierId}` : null,
    () => ApiClient.get<any[]>(API_ENDPOINTS.suppliers.products(supplierId as string)),
  )
  return { supplierProducts: data || [], isLoading, isError: error, mutate }
}

export default function EditSupplierPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supplierId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { supplier, isLoading } = useSupplier(supplierId || "")
  const { supplierProducts, isLoading: loadingProducts, mutate: mutateSupplierProducts } = useSupplierProducts(supplierId)

  const [pendingProducts, setPendingProducts] = useState<{ productId: string }[]>([{ productId: "" }])
  const [productToDelete, setProductToDelete] = useState<{ id: string; name?: string } | null>(null)

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

  const currentSupplierType = form.supplierType || supplier?.supplierType || undefined
  const { products: productsByType, isLoading: loadingProductsByType } = useProductsByType(currentSupplierType as string)

  const addPendingProduct = () => setPendingProducts((prev) => [...prev, { productId: "" }])
  const removePendingProduct = (index: number) => setPendingProducts((prev) => prev.filter((_, i) => i !== index))
  const updatePendingProduct = (index: number, productId: string) =>
    setPendingProducts((prev) => prev.map((r, i) => (i === index ? { ...r, productId } : r)))

  const associateProduct = async (index: number) => {
    if (!supplierId) return
    const row = pendingProducts[index]
    if (!row?.productId) {
      toast.error("Selecciona un producto")
      return
    }

    const loadingToast = toast.loading("Asociando producto...")
    try {
      // addProductSupplier expects (productId, { supplierId, price, ... })
      await addProductSupplier(row.productId, { supplierId, price: 0, preferred: false })
      if (mutateSupplierProducts) await mutateSupplierProducts()
      setPendingProducts((prev) => prev.filter((_, i) => i !== index))
      toast.dismiss(loadingToast)
      toast.success("Producto asociado")
    } catch (err: any) {
      toast.dismiss(loadingToast)
      toast.error(err?.message || "Error asociando producto")
    }
  }

  const confirmRemoveProduct = async () => {
    if (!productToDelete) return
    try {
      const psId = productToDelete.id
      // We need the productId to remove via API path; find it in supplierProducts
      const ps = supplierProducts.find((p: any) => String(p.id) === String(psId))
      if (!ps) throw new Error("Asociación no encontrada")
      await ApiClient.delete(API_ENDPOINTS.productSuppliers.remove(ps.productId, ps.id))
      if (mutateSupplierProducts) await mutateSupplierProducts()
      toast.success("Asociación eliminada")
    } catch (err: any) {
      toast.error(err?.message || "Error eliminando asociación")
    } finally {
      setProductToDelete(null)
    }
  }

  const availableProducts = (index: number) => {
    const selectedInOtherRows = new Set(
      pendingProducts
        .filter((_, i) => i !== index)
        .map((row) => row.productId)
        .filter(Boolean)
        .map(String),
    )

    const associatedIds = new Set((supplierProducts || []).map((sp: any) => String(sp.productId)))

    return (productsByType || []).filter((p: any) => {
      const pid = String(p.id)
      return !associatedIds.has(pid) && !selectedInOtherRows.has(pid)
    })
  }

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/suppliers">Cancelar</Link>
          </Button>
          <Button type="submit" form="edit-supplier-form" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Cambios
          </Button>
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
          <form id="edit-supplier-form" onSubmit={handleSubmit}>
            <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Información</CardTitle>
                    <CardDescription>Datos básicos del proveedor</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
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

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactName">Contacto</Label>
                        <Input id="contactName" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
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
                        <Label htmlFor="creditDays">Días de Crédito</Label>
                        <Input id="creditDays" type="number" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessType">Giro</Label>
                        <Input id="businessType" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
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
              </div>
          </form>
        </TabsContent>

        {/* ── Tab: Productos ── */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Agregar productos</CardTitle>
              <CardDescription>Selecciona uno o más productos y asócialos al proveedor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {pendingProducts.map((row, index) => (
                  <div key={`pending-product-${index}`} className="space-y-3 rounded-md border border-dashed p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Producto</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removePendingProduct(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <ComboBox
                          value={row.productId}
                          onChange={(v) => updatePendingProduct(index, v)}
                          options={availableProducts(index).map((p: any) => ({ value: String(p.id), label: `${p.sku} · ${p.name}`, subtitle: p.type }))}
                          placeholder="Seleccionar producto..."
                          searchPlaceholder="Buscar producto..."
                          emptyMessage="No hay productos disponibles"
                        />
                      </div>
                      <div className="shrink-0">
                        <Button type="button" onClick={() => associateProduct(index)} disabled={!row.productId}>
                          Asociar producto
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" onClick={addPendingProduct} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Agregar otro producto
              </Button>
            </CardContent>
          </Card>

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
                      <TableHead>Acciones</TableHead>
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
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setProductToDelete({ id: ps.id, name: ps.product?.name })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar asociación?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará la asociación con <strong>{productToDelete?.name}</strong>. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmRemoveProduct} className="bg-red-600 text-white hover:bg-red-700">
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>
    </div>
  )
}
