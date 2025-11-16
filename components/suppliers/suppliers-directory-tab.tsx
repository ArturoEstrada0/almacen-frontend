"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockSuppliers } from "@/lib/mock-data"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { Search, Building2, Edit, Trash2, Mail, Phone, Send } from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function SuppliersDirectoryTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")

  const { suppliers: apiSuppliers, isLoading, isError, mutate } = useSuppliers()

  // Map backend supplier shape to the UI shape previously provided by mockSuppliers
  const mappedSuppliers = apiSuppliers.map((s: any) => ({
    id: s.id,
    code: s.code || "",
    businessName: s.name || "",
    rfc: s.rfc || s.taxId || "",
    businessType: s.businessType || "",
    contactName: s.contactName || "",
    phone: s.phone || "",
    email: s.email || "",
    creditDays: s.paymentTerms || 0,
    isActive: s.active ?? true,
    city: s.city || "",
    state: s.state || "",
  }))

  const filteredSuppliers = mappedSuppliers.filter((supplier) => {
    return (
      supplier.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.rfc.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const handleSendEmail = (supplierId: string) => {
    setSelectedSupplier(supplierId)
    const supplier = mappedSuppliers.find((s) => s.id === supplierId)
    setEmailSubject(`Solicitud de Cotización - ${new Date().toLocaleDateString()}`)
    setEmailBody(
      `Estimado/a ${supplier?.contactName || supplier?.businessName},\n\nNos ponemos en contacto para solicitar una cotización de los siguientes productos:\n\n[Agregar detalles de productos]\n\nQuedamos atentos a su respuesta.\n\nSaludos cordiales.`,
    )
  }

  return (
    <>
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, código o RFC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
          <CardHeader>
          <CardTitle>Directorio de Proveedores</CardTitle>
          <CardDescription>
            {isLoading ? "Cargando proveedores..." : `${filteredSuppliers.length} proveedor${filteredSuppliers.length !== 1 ? "es" : ""} encontrado${filteredSuppliers.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Razón Social</TableHead>
                <TableHead>RFC</TableHead>
                <TableHead>Giro</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Crédito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-destructive">Error al cargar proveedores</TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-mono text-sm">{supplier.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{supplier.businessName}</p>
                        <p className="text-xs text-muted-foreground">
                          {supplier.city}, {supplier.state}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{supplier.rfc}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{supplier.businessType}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {supplier.contactName && <p className="text-sm font-medium">{supplier.contactName}</p>}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {supplier.phone}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {supplier.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{supplier.creditDays} días</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.isActive ? "default" : "secondary"}>
                      {supplier.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendEmail(supplier.id)}
                            title="Enviar correo"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Enviar Correo a {supplier.businessName}</DialogTitle>
                            <DialogDescription>Para: {supplier.email}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="subject">Asunto</Label>
                              <Input
                                id="subject"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                placeholder="Asunto del correo"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="body">Mensaje</Label>
                              <Textarea
                                id="body"
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                placeholder="Escribe tu mensaje aquí..."
                                rows={10}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline">Cancelar</Button>
                              <Button>
                                <Send className="mr-2 h-4 w-4" />
                                Enviar Correo
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/suppliers/${supplier.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
