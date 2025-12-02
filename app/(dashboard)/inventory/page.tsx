"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { Warehouse, Package2, MapPin, ArrowRight, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { StockTab } from "@/components/inventory/stock-tab"
import { MovementsTab } from "@/components/inventory/movements-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProtectedCreate } from "@/components/auth/protected-action"

export default function InventoryPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null)
  const { warehouses, isLoading: warehousesLoading } = useWarehouses()
  const [activeTab, setActiveTab] = useState("stock")

  if (!selectedWarehouse) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock y Almacenes</h1>
          <p className="text-muted-foreground">Selecciona un almacén para ver su inventario y movimientos</p>
        </div>

        <div className="flex justify-end">
          <ProtectedCreate module="warehouses">
            <Link href="/warehouses/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Almacén
              </Button>
            </Link>
          </ProtectedCreate>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(warehouses || []).map((warehouse, index) => (
            <motion.div
              key={warehouse.id ? warehouse.id : index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
                onClick={() => setSelectedWarehouse(warehouse.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Warehouse className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant={(warehouse as any).isActive ? "default" : "secondary"}>
                      {(warehouse as any).isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4">{warehouse.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">{warehouse.code}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{(warehouse as any).address || (warehouse as any).location || "-"}</span>
                  </div>
                  {(warehouse as any).description && <p className="text-sm text-muted-foreground">{(warehouse as any).description}</p>}
                  {warehouse.zones && warehouse.zones.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Package2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {warehouse.zones.length} zona{warehouse.zones.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  <Button className="w-full bg-transparent" variant="outline">
                    Ver Inventario
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  const warehouse = (warehouses || []).find((wh) => wh.id === selectedWarehouse)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedWarehouse(null)}>
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{warehouse?.name}</h1>
              <p className="text-muted-foreground">
                {warehouse?.code} • {warehouse?.location}
              </p>
            </div>
          </div>
        </div>
        <Badge variant={warehouse?.isActive ? "default" : "secondary"} className="text-sm px-3 py-1">
          {warehouse?.isActive ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="stock" className="gap-2">
            <Package2 className="h-4 w-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Movimientos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <StockTab warehouseId={selectedWarehouse} />
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <MovementsTab warehouseId={selectedWarehouse} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
