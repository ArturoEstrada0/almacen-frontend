"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Building2, FileText } from "lucide-react"
import Link from "next/link"
import { QuotationsTab } from "@/components/suppliers/quotations-tab"
import { SuppliersDirectoryTab } from "@/components/suppliers/suppliers-directory-tab"

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState("directory")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground">Gestión de proveedores, cotizaciones y relaciones comerciales</p>
        </div>
        <Link href="/suppliers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proveedor
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="directory" className="gap-2">
            <Building2 className="h-4 w-4" />
            Directorio
          </TabsTrigger>
          <TabsTrigger value="quotations" className="gap-2">
            <FileText className="h-4 w-4" />
            Cotizaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <SuppliersDirectoryTab />
        </TabsContent>

        <TabsContent value="quotations" className="space-y-4">
          <QuotationsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
