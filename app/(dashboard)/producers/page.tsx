"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProducersDirectoryTab } from "@/components/producers/producers-directory-tab"
import { InputAssignmentsTab } from "@/components/producers/input-assignments-tab"
import { FruitReceptionsTab } from "@/components/producers/fruit-receptions-tab"
import { ShipmentsTab } from "@/components/producers/shipments-tab"
import { AccountStatementsTab } from "@/components/producers/account-statements-tab"
import { PaymentReportsTab } from "@/components/producers/payment-reports-tab"

export default function ProducersPage() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      if (typeof window === 'undefined') return 'directory'
      const params = new URL(window.location.href).searchParams
      return params.get('tab') || 'directory'
    } catch {
      return 'directory'
    }
  })

  // Keep the `tab` param in the URL in sync with the active tab without navigating
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', activeTab)
      window.history.replaceState({}, '', url.toString())
    } catch {
      // ignore
    }
  }, [activeTab])

  // Listen to back/forward navigation and update tab from URL
  useEffect(() => {
    const onPop = () => {
      try {
        const params = new URL(window.location.href).searchParams
        setActiveTab(params.get('tab') || 'directory')
      } catch {
        setActiveTab('directory')
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Productores</h1>
        <p className="text-muted-foreground">
          Gestión completa de productores, asignación de insumos, recepción de fruta y estados de cuenta
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="directory">Directorio</TabsTrigger>
          <TabsTrigger value="assignments">Asignación de Insumos</TabsTrigger>
          <TabsTrigger value="receptions">Recepción de Fruta</TabsTrigger>
          <TabsTrigger value="shipments">Embarques</TabsTrigger>
          <TabsTrigger value="accounts">Estados de Cuenta</TabsTrigger>
          <TabsTrigger value="payments">Reportes de Pago</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <ProducersDirectoryTab />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <InputAssignmentsTab />
        </TabsContent>

        <TabsContent value="receptions" className="space-y-4">
          <FruitReceptionsTab />
        </TabsContent>

        <TabsContent value="shipments" className="space-y-4">
          <ShipmentsTab />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <AccountStatementsTab />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
