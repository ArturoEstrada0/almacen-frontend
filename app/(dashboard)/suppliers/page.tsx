"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Building2, FileText, DollarSign } from "lucide-react"
import Link from "next/link"
import { QuotationsTab } from "@/components/suppliers/quotations-tab"
import { SuppliersDirectoryTab } from "@/components/suppliers/suppliers-directory-tab"
import { AccountsPayableTab } from "@/components/purchase-orders/accounts-payable-tab"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ProtectedCreate } from "@/components/auth/protected-action"

export default function SuppliersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(initialTab === "quotations" || initialTab === "payables" ? initialTab : "directory")

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "directory" || tab === "quotations" || tab === "payables") {
      setActiveTab(tab)
    } else {
      setActiveTab("directory")
    }
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value === "directory") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground">Gestión de proveedores, cotizaciones y relaciones comerciales</p>
        </div>
        <ProtectedCreate module="suppliers">
          <Link href="/suppliers/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </Link>
        </ProtectedCreate>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="directory" className="gap-2">
            <Building2 className="h-4 w-4" />
            Directorio
          </TabsTrigger>
          <TabsTrigger value="quotations" className="gap-2">
            <FileText className="h-4 w-4" />
            Cotizaciones
          </TabsTrigger>
          <TabsTrigger value="payables" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Cuentas por Pagar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <SuppliersDirectoryTab />
        </TabsContent>

        <TabsContent value="quotations" className="space-y-4">
          <QuotationsTab />
        </TabsContent>

        <TabsContent value="payables" className="space-y-4">
          <AccountsPayableTab
            onRegister={(row) => {
              if (row.supplierId) {
                router.push(`/accounts/suppliers/${row.supplierId}`)
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
