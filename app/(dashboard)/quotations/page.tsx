"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Mail, 
  CheckCircle, 
  XCircle,
  FileText,
  BarChart3,
  Loader2,
  RefreshCw
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"

interface Quotation {
  id: string
  code: string
  description?: string
  status: string
  date: string
  validUntil: string
  items: any[]
  supplierTokens: {
    id: string
    supplierId: string
    emailSent: boolean
    used: boolean
    supplier: {
      id: string
      name: string
      email: string
    }
  }[]
  createdAt: string
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  pendiente: { label: "Pendiente", variant: "default" },
  enviada: { label: "Enviada", variant: "default" },
  parcial: { label: "Parcialmente Respondida", variant: "outline" },
  completada: { label: "Completada", variant: "default" },
  cerrada: { label: "Cerrada", variant: "default" },
  cancelada: { label: "Cancelada", variant: "destructive" },
}

export default function QuotationsPage() {
  const router = useRouter()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sendingEmails, setSendingEmails] = useState<string | null>(null)

  useEffect(() => {
    fetchQuotations()
  }, [])

  const fetchQuotations = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${apiUrl}/quotations`)
      if (response.ok) {
        const data = await response.json()
        setQuotations(data)
      }
    } catch (error) {
      console.error("Error fetching quotations:", error)
      toast.error("Error al cargar las cotizaciones")
    } finally {
      setLoading(false)
    }
  }

  const handleSendAllEmails = async (quotationId: string) => {
    setSendingEmails(quotationId)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${apiUrl}/quotations/${quotationId}/send-all-emails`, {
        method: "POST",
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.sent.length > 0) {
          toast.success(`Correos enviados a: ${result.sent.join(", ")}`)
        }
        if (result.failed.length > 0) {
          toast.error(`Error al enviar a: ${result.failed.join(", ")}`)
        }
        fetchQuotations()
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al enviar correos")
      }
    } catch (error) {
      console.error("Error sending emails:", error)
      toast.error("Error al enviar correos")
    } finally {
      setSendingEmails(null)
    }
  }

  const handleCancel = async (quotationId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${apiUrl}/quotations/${quotationId}/cancel`, {
        method: "PATCH",
      })
      
      if (response.ok) {
        toast.success("Cotización cancelada")
        fetchQuotations()
      } else {
        toast.error("Error al cancelar la cotización")
      }
    } catch (error) {
      toast.error("Error al cancelar la cotización")
    }
  }

  const filteredQuotations = quotations.filter((q) =>
    q.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getResponseStats = (quotation: Quotation) => {
    const total = quotation.supplierTokens?.length || 0
    const responded = quotation.supplierTokens?.filter((t) => t.used).length || 0
    const emailsSent = quotation.supplierTokens?.filter((t) => t.emailSent).length || 0
    return { total, responded, emailsSent }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cotizaciones</h1>
          <p className="text-muted-foreground">
            Gestiona solicitudes de cotización a proveedores
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchQuotations}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Link href="/quotations/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cotización
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quotations.filter((q) => ["enviada", "parcial", "completada"].includes(q.status)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quotations.filter((q) => q.status === "completada").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cerradas</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quotations.filter((q) => q.status === "cerrada").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Cotizaciones</CardTitle>
          <CardDescription>
            {filteredQuotations.length} cotizaciones encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Válido Hasta</TableHead>
                <TableHead>Proveedores</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron cotizaciones
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotations.map((quotation) => {
                  const stats = getResponseStats(quotation)
                  const status = statusConfig[quotation.status] || { label: quotation.status, variant: "default" as const }
                  const isExpired = new Date(quotation.validUntil) < new Date()

                  return (
                    <TableRow key={quotation.id}>
                      <TableCell className="font-medium">{quotation.code}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {quotation.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {isExpired && quotation.status !== "cerrada" && quotation.status !== "cancelada" && (
                          <Badge variant="destructive" className="ml-2">Expirada</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(quotation.date), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(quotation.validUntil), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-green-600">{stats.responded}</span>
                          <span>/</span>
                          <span>{stats.total}</span>
                          <span className="text-muted-foreground ml-1">
                            ({stats.emailsSent} enviados)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{quotation.items?.length || 0}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/quotations/${quotation.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalle
                              </Link>
                            </DropdownMenuItem>
                            {quotation.status !== "cancelada" && quotation.status !== "cerrada" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleSendAllEmails(quotation.id)}
                                  disabled={sendingEmails === quotation.id}
                                >
                                  {sendingEmails === quotation.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Mail className="mr-2 h-4 w-4" />
                                  )}
                                  Enviar Correos
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/quotations/${quotation.id}/comparison`}>
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    Ver Comparación
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleCancel(quotation.id)}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancelar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
