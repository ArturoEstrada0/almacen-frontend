"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PurchaseOrdersListTab } from "@/components/purchase-orders/purchase-orders-list-tab"
import { NewPurchaseOrderTab } from "@/components/purchase-orders/new-purchase-order-tab"
import { AccountsPayableTab } from "@/components/purchase-orders/accounts-payable-tab"
import { ProtectedCreate } from "@/components/auth/protected-action"

export default function PurchaseOrdersPage() {
  const [activeTab, setActiveTab] = useState("list")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Órdenes de Compra</h1>
        <p className="text-muted-foreground">Gestión de compras, recepciones y cuentas por pagar</p>
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
