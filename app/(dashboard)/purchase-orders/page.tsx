"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PurchaseOrdersListTab } from "@/components/purchase-orders/purchase-orders-list-tab"
import { NewPurchaseOrderTab } from "@/components/purchase-orders/new-purchase-order-tab"
import { AccountsPayableTab } from "@/components/purchase-orders/accounts-payable-tab"
import { PaymentsHistoryTab } from "@/components/purchase-orders/payments-history-tab"
import { ProtectedCreate } from "@/components/auth/protected-action"

export default function PurchaseOrdersPage() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams?.get("tab") as string) || "list"
  const [activeTab, setActiveTab] = useState(initialTab)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const t = (searchParams?.get("tab") as string) || "list"
    setActiveTab(t)
  }, [searchParams])

  useEffect(() => {
    try {
      const params = new URLSearchParams(searchParams?.toString() || "")
      if (activeTab) params.set("tab", activeTab)
      else params.delete("tab")
      const qs = params.toString()
      const url = qs ? `${pathname}?${qs}` : pathname
      router.replace(url)
    } catch (e) {
      // ignore
    }
  }, [activeTab, router, pathname, searchParams])

  return (
    <div className="space-y-6">
      <div className="py-4">
        {(() => {
          const map: Record<string, { title: string; description: string }> = {
            list: {
              title: "Órdenes de Compra",
              description: "Gestiona y recibe órdenes de compra",
            },
            payments: {
              title: "Histórico de Pagos",
              description: "Consulta el historial de pagos realizados a proveedores",
            },
            new: {
              title: "Nueva Orden de Compra",
              description: "Crea una nueva orden de compra a proveedor",
            },
            payables: {
              title: "Cuentas por Pagar",
              description: "Gestiona pagos pendientes a proveedores",
            },
          }
          const header = map[activeTab] || map.list
          return (
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{header.title}</h1>
                <p className="text-muted-foreground">{header.description}</p>
              </div>
              <ProtectedCreate module="purchaseOrders">
                <Button onClick={() => setActiveTab("new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Orden
                </Button>
              </ProtectedCreate>
            </div>
          )
        })()}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Órdenes</TabsTrigger>
          <TabsTrigger value="new">Nueva Orden</TabsTrigger>
          <TabsTrigger value="payables">Cuentas por Pagar</TabsTrigger>
          <TabsTrigger value="payments">Histórico de Pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <PurchaseOrdersListTab
            onCreateNew={() => setActiveTab("new")}
          />
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <ProtectedCreate module="purchaseOrders">
            <NewPurchaseOrderTab
              mode="create"
              onSuccess={() => setActiveTab("list")}
              onCancelEdit={() => setActiveTab("list")}
            />
          </ProtectedCreate>
        </TabsContent>

        <TabsContent value="payables" className="space-y-4">
          <AccountsPayableTab />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentsHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
