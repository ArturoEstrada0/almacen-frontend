"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PurchaseOrdersListTab } from "@/components/purchase-orders/purchase-orders-list-tab"
import { NewPurchaseOrderTab } from "@/components/purchase-orders/new-purchase-order-tab"
import { AccountsPayableTab } from "@/components/purchase-orders/accounts-payable-tab"
import { ProtectedCreate } from "@/components/auth/protected-action"

export default function PurchaseOrdersPage() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams?.get("tab") as string) || "list"
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    const t = (searchParams?.get("tab") as string) || "list"
    setActiveTab(t)
  }, [searchParams])

  return (
    <div className="space-y-6">
      <div>
        {(() => {
          const map: Record<string, { title: string; description: string }> = {
            list: {
              title: "Órdenes de Compra",
              description: "Gestiona y recibe órdenes de compra",
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
            <>
              <h1 className="text-3xl font-bold tracking-tight">{header.title}</h1>
              <p className="text-muted-foreground">{header.description}</p>
            </>
          )
        })()}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Órdenes</TabsTrigger>
          <TabsTrigger value="new">Nueva Orden</TabsTrigger>
          <TabsTrigger value="payables">Cuentas por Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <PurchaseOrdersListTab onCreateNew={() => setActiveTab("new")} />
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <ProtectedCreate module="purchaseOrders">
            <NewPurchaseOrderTab onSuccess={() => setActiveTab("list")} />
          </ProtectedCreate>
        </TabsContent>

        <TabsContent value="payables" className="space-y-4">
          <AccountsPayableTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
