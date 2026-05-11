"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Link2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ComboBox } from "@/components/ui/combobox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ProtectedUpdate } from "@/components/auth/protected-action"
import { useProduct, useProductSuppliers, addProductSupplier, removeProductSupplier } from "@/lib/hooks/use-products"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { toast } from "@/lib/utils/toast"

interface Params {
  params: any
}

type PendingSupplierRow = { supplierId: string }

export default function ProductSuppliersPage({ params }: Params) {
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [pendingSuppliers, setPendingSuppliers] = useState<PendingSupplierRow[]>([{ supplierId: "" }])
  const [supplierToDelete, setSupplierToDelete] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    if (!params) return
    if (typeof (params as any)?.then === "function") {
      ;(params as any).then((p: any) => setResolvedId(p.id))
    } else {
      setResolvedId((params as any).id)
    }
  }, [params])

  const { product, isLoading } = useProduct(resolvedId)
  const { suppliers: allSuppliers } = useSuppliers()
  const { productSuppliers, mutate: mutateSuppliers } = useProductSuppliers(resolvedId)

  const associatedIds = useMemo(
    () => new Set((productSuppliers || []).map((ps: any) => String(ps.supplierId))),
    [productSuppliers],
  )

  const addPendingSupplier = () => {
    setPendingSuppliers((prev) => [...prev, { supplierId: "" }])
  }

  const removePendingSupplier = (index: number) => {
    setPendingSuppliers((prev) => prev.filter((_, i) => i !== index))
  }

  const updatePendingSupplier = (index: number, supplierId: string) => {
    setPendingSuppliers((prev) => prev.map((row, i) => (i === index ? { ...row, supplierId } : row)))
  }

  const associateSupplier = async (index: number) => {
    if (!resolvedId) return

    const row = pendingSuppliers[index]
    if (!row?.supplierId) {
      toast.error("Selecciona un proveedor")
      return
    }

    const supplier = allSuppliers.find((s: any) => String(s.id) === String(row.supplierId))
    const loadingToast = toast.loading("Asociando proveedor...")

    try {
      await addProductSupplier(resolvedId, {
        supplierId: row.supplierId,
        price: 0,
        preferred: false,
      })
      await mutateSuppliers()
      setPendingSuppliers((prev) => prev.filter((_, i) => i !== index))
      toast.dismiss(loadingToast)
      toast.success(`Proveedor ${supplier?.name || "asociado"}`)
    } catch (error: any) {
      toast.dismiss(loadingToast)
      toast.error(error?.message || "Error asociando proveedor")
    }
  }

  const confirmRemoveSupplier = async () => {
    if (!resolvedId || !supplierToDelete) return

    const loadingToast = toast.loading("Eliminando proveedor...")
    try {
      await removeProductSupplier(resolvedId, supplierToDelete.id)
      await mutateSuppliers()
      toast.dismiss(loadingToast)
      toast.success("Proveedor eliminado")
    } catch (error: any) {
      toast.dismiss(loadingToast)
      toast.error(error?.message || "Error eliminando proveedor")
    } finally {
      setSupplierToDelete(null)
    }
  }

  if (isLoading || !resolvedId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Producto no encontrado</p>
      </div>
    )
  }

  const availableSuppliers = (index: number) => {
    const selectedInOtherRows = new Set(
      pendingSuppliers
        .filter((_, i) => i !== index)
        .map((row) => row.supplierId)
        .filter(Boolean)
        .map(String),
    )

    return (allSuppliers || []).filter((supplier: any) => {
      const supplierId = String(supplier.id)
      return !associatedIds.has(supplierId) && !selectedInOtherRows.has(supplierId)
    })
  }

  return (
    <ProtectedUpdate module="products" fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">No tienes permisos para asociar proveedores</p>
      </div>
    }>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/products">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Asociar Proveedores</h1>
              <p className="text-muted-foreground">Asocia este producto con uno o varios proveedores sin editar el resto de sus datos</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/products/${resolvedId}`}>
              <Link2 className="mr-2 h-4 w-4" />
              Volver a editar
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{product.name}</CardTitle>
            <CardDescription>
              SKU: {product.sku} · {product.type || "Sin tipo"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Esta pantalla solo gestiona asociaciones con proveedores.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agregar proveedores</CardTitle>
            <CardDescription>Selecciona uno o más proveedores y asócialos al producto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {pendingSuppliers.map((row, index) => (
                <div key={`pending-supplier-${index}`} className="space-y-3 rounded-md border border-dashed p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Proveedor</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removePendingSupplier(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <ComboBox
                    value={row.supplierId}
                    onChange={(v) => updatePendingSupplier(index, v)}
                    options={availableSuppliers(index).map((supplier: any) => ({
                      value: String(supplier.id),
                      label: supplier.name,
                    }))}
                    placeholder="Seleccionar proveedor..."
                    searchPlaceholder="Buscar proveedor..."
                    emptyMessage="No hay proveedores disponibles"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => associateSupplier(index)}
                      disabled={!row.supplierId}
                    >
                      Asociar proveedor
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={addPendingSupplier} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Agregar otro proveedor
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proveedores asociados ({productSuppliers.length})</CardTitle>
            <CardDescription>Administrar proveedores ya vinculados a este producto</CardDescription>
          </CardHeader>
          <CardContent>
            {productSuppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay proveedores asociados</p>
            ) : (
              <div className="space-y-2">
                {productSuppliers.map((ps: any) => {
                  const supplierName = ps.supplier?.name || allSuppliers.find((s: any) => String(s.id) === String(ps.supplierId))?.name || ps.supplierId
                  return (
                    <div key={ps.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">{supplierName}</p>
                        {ps.preferred && <p className="text-xs text-muted-foreground">Preferido</p>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setSupplierToDelete({ id: ps.id, name: supplierName })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará la asociación con <strong>{supplierToDelete?.name}</strong>. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRemoveSupplier} className="bg-red-600 text-white hover:bg-red-700">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedUpdate>
  )
}
