"use client"

import { useEffect, useState } from "react"
import { formatLocalDateOnly } from "@/lib/date-utils"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePurchaseOrder } from "@/lib/hooks/use-purchase-orders"
import { NewPurchaseOrderTab } from "@/components/purchase-orders/new-purchase-order-tab"

interface Params {
  params: any
}

export default function EditPurchaseOrderPage({ params }: Params) {
  const router = useRouter()
  const [resolvedId, setResolvedId] = useState<string | null>(null)

  useEffect(() => {
    if (!params) return
    if (typeof (params as any)?.then === "function") {
      ;(params as any).then((p: any) => setResolvedId(p.id))
    } else {
      setResolvedId((params as any).id)
    }
  }, [params])

  const { purchaseOrder, isLoading } = usePurchaseOrder(resolvedId ?? "")

  const isFinalStatus = purchaseOrder?.status === "completada" || purchaseOrder?.status === "cancelada"

  if (isLoading || !resolvedId) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <p className="text-muted-foreground text-sm">Cargando orden...</p>
    </div>
  )

  if (!purchaseOrder) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-muted-foreground">Orden no encontrada</p>
      <Link href="/purchase-orders?tab=list">
        <Button variant="outline">Volver a órdenes</Button>
      </Link>
    </div>
  )

  if (isFinalStatus) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchase-orders?tab=list">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orden no editable</h1>
          <p className="text-muted-foreground">Esta orden está {purchaseOrder.status} y no puede modificarse.</p>
        </div>
      </div>

      <div className="rounded-lg border p-6 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Número</p>
            <p className="font-medium">{purchaseOrder.orderNumber || purchaseOrder.code || purchaseOrder.id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Proveedor</p>
            <p className="font-medium">{purchaseOrder.supplierName || (purchaseOrder.supplier && purchaseOrder.supplier.name) || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Almacén</p>
            <p className="font-medium">{purchaseOrder.warehouse?.name || purchaseOrder.warehouseName || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha Orden</p>
            <p className="font-medium">{formatLocalDateOnly(purchaseOrder.orderDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha Entrega Esperada</p>
            <p className="font-medium">{formatLocalDateOnly(purchaseOrder.expectedDeliveryDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-medium">{purchaseOrder.total != null ? `$${Number(purchaseOrder.total).toFixed(2)}` : "-"}</p>
          </div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">Para cambiarla, crea una nueva orden o consulta el detalle desde la lista.</div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchase-orders?tab=list">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Orden {purchaseOrder.orderNumber}</h1>
          <p className="text-muted-foreground">Modifica productos y cantidades de la orden</p>
        </div>
      </div>

      <NewPurchaseOrderTab
        mode="edit"
        initialOrder={purchaseOrder}
        onSuccess={() => router.push("/purchase-orders?tab=list")}
        onCancelEdit={() => router.push("/purchase-orders?tab=list")}
      />
    </div>
  )
}
