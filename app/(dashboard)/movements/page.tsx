"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MovementsHistoryTab } from "@/components/movements/movements-history-tab"
import { NewMovementTab } from "@/components/movements/new-movement-tab"
import { TransfersTab } from "@/components/movements/transfers-tab"
import { AdjustmentsTab } from "@/components/movements/adjustments-tab"
import { History, Plus, ArrowLeftRight, Settings } from "lucide-react"

export default function MovementsPage() {
  const [activeTab, setActiveTab] = useState("history")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Movimientos de Inventario</h1>
        <p className="text-muted-foreground">Gestión completa de entradas, salidas, traspasos y ajustes</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo
          </TabsTrigger>
          <TabsTrigger value="transfers" className="gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Traspasos
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="gap-2">
            <Settings className="h-4 w-4" />
            Ajustes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <MovementsHistoryTab />
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <NewMovementTab />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <TransfersTab />
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4">
          <AdjustmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
