"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Spinner2 from "@/components/ui/spinner2"
import { Building2, Search, Truck, Wallet } from "lucide-react"
import { useCustomers } from "@/lib/hooks/use-customers"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AccountsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [customerQuery, setCustomerQuery] = useState("")
  const [supplierQuery, setSupplierQuery] = useState("")
  const [activeTab, setActiveTab] = useState(() =>
    searchParams?.get("tab") === "suppliers" ? "suppliers" : "customers"
  )
  const { customers, fetchCustomers, isLoading } = useCustomers()
  const { suppliers, isLoading: isSuppliersLoading } = useSuppliers()

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    const tab = searchParams?.get("tab") === "suppliers" ? "suppliers" : "customers"
    setActiveTab(tab)
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams?.toString())

    if (value === "suppliers") {
      params.set("tab", "suppliers")
    } else {
      params.delete("tab")
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const filteredCustomers = customers.filter((c) => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      (c.customerCode || "").toLowerCase().includes(q) ||
      (c.rfc || "").toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.contactName || "").toLowerCase().includes(q)
    )
  })

  const filteredSuppliers = suppliers.filter((s: any) => {
    const q = supplierQuery.trim().toLowerCase()
    if (!q) return true
    return (
      String(s?.name || "").toLowerCase().includes(q) ||
      String(s?.rfc || s?.taxId || "").toLowerCase().includes(q) ||
      String(s?.email || "").toLowerCase().includes(q) ||
      String(s?.contactName || "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Cuentas</h1>
          <p className="text-gray-600 text-sm">Administra cuentas por cobrar de clientes y cuentas por pagar de proveedores</p>
        </div>
        <div>
          <Button asChild>
            <a href={activeTab === "customers" ? "/receivables/pending" : "/purchase-orders/pending"}>Ver facturas pendientes</a>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="customers" className="gap-2">
            <Building2 className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Truck className="h-4 w-4" />
            Proveedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>Selecciona un cliente para ver su estado de cuenta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input className="pl-10" placeholder="Buscar cliente..." value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} />
                </div>
                <Button variant="outline" onClick={() => setCustomerQuery("")}>Limpiar</Button>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner2 />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RFC</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-sm">{c.rfc || "-"}</TableCell>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>{c.contactName || "-"}</TableCell>
                          <TableCell>{c.email}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => router.push(`/accounts/${c.id}`)} className="gap-2">
                              <Wallet className="h-4 w-4" />
                              Ver cuenta
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proveedores</CardTitle>
              <CardDescription>Selecciona un proveedor para ver su estado de cuenta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input className="pl-10" placeholder="Buscar proveedor..." value={supplierQuery} onChange={(e) => setSupplierQuery(e.target.value)} />
                </div>
                <Button variant="outline" onClick={() => setSupplierQuery("")}>Limpiar</Button>
              </div>

              {isSuppliersLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner2 />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RFC</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSuppliers.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-sm">{s.rfc || s.taxId || "-"}</TableCell>
                          <TableCell>{s.name || "-"}</TableCell>
                          <TableCell>{s.contactName || "-"}</TableCell>
                          <TableCell>{s.email || "-"}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => router.push(`/accounts/suppliers/${s.id}`)} className="gap-2">
                              <Wallet className="h-4 w-4" />
                              Ver cuenta
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
