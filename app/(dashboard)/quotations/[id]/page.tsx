"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { 
  ArrowLeft, 
  Loader2, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Package, 
  Building2,
  BarChart3,
  Calendar,
  FileText,
  Send
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface Quotation {
  id: string
  code: string
  description?: string
  status: string
  date: string
  validUntil: string
  notes?: string
  winningSupplierId?: string
  items: {
    id: string
    productId: string
    quantity: number
    notes?: string
    product: {
      id: string
      code: string
      name: string
      unit?: { abbreviation: string }
    }
    supplierResponses?: {
      id: string
      supplierId: string
      price: number
      currency: string
      leadTimeDays?: number
      available: boolean
      notes?: string
      supplier: { id: string; name: string }
    }[]
  }[]
  supplierTokens: {
    id: string
    supplierId: string
    emailSent: boolean
    emailSentAt?: string
    used: boolean
    usedAt?: string
    supplier: {
      id: string
      name: string
      email: string
      contactName?: string
    }
  }[]
  createdAt: string
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  borrador: { label: "Borrador", variant: "secondary", color: "bg-gray-100 text-gray-800" },
  pendiente: { label: "Pendiente", variant: "default", color: "bg-yellow-100 text-yellow-800" },
  enviada: { label: "Enviada", variant: "default", color: "bg-blue-100 text-blue-800" },
  parcial: { label: "Parcialmente Respondida", variant: "outline", color: "bg-orange-100 text-orange-800" },
  completada: { label: "Completada", variant: "default", color: "bg-green-100 text-green-800" },
  cerrada: { label: "Cerrada", variant: "default", color: "bg-purple-100 text-purple-800" },
  cancelada: { label: "Cancelada", variant: "destructive", color: "bg-red-100 text-red-800" },
}

export default function QuotationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const quotationId = params.id as string
  
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingEmails, setSendingEmails] = useState(false)
  const [sendingToSupplier, setSendingToSupplier] = useState<string | null>(null)

  useEffect(() => {
    fetchQuotation()
  }, [quotationId])

  const fetchQuotation = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${apiUrl}/quotations/${quotationId}`)
      if (response.ok) {
        const data = await response.json()
        setQuotation(data)
      } else {
        toast.error("Error al cargar la cotización")
        router.push("/quotations")
      }
    } catch (error) {
      console.error("Error fetching quotation:", error)
      toast.error("Error al cargar la cotización")
    } finally {
      setLoading(false)
    }
  }

  const handleSendAllEmails = async () => {
    setSendingEmails(true)
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
        fetchQuotation()
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al enviar correos")
      }
    } catch (error) {
      toast.error("Error al enviar correos")
    } finally {
      setSendingEmails(false)
    }
  }

  const handleSendToSupplier = async (supplierId: string) => {
    setSendingToSupplier(supplierId)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${apiUrl}/quotations/${quotationId}/send-emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierIds: [supplierId] }),
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.sent.length > 0) {
          toast.success(`Correo enviado exitosamente`)
        }
        if (result.failed.length > 0) {
          toast.error(`Error al enviar el correo`)
        }
        fetchQuotation()
      } else {
        toast.error("Error al enviar correo")
      }
    } catch (error) {
      toast.error("Error al enviar correo")
    } finally {
      setSendingToSupplier(null)
    }
  }

  const handleCancel = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${apiUrl}/quotations/${quotationId}/cancel`, {
        method: "PATCH",
      })
      
      if (response.ok) {
        toast.success("Cotización cancelada")
        fetchQuotation()
      } else {
        toast.error("Error al cancelar")
      }
    } catch (error) {
      toast.error("Error al cancelar")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!quotation) {
    return null
  }

  const status = statusConfig[quotation.status] || { label: quotation.status, variant: "default" as const, color: "" }
  const isExpired = new Date(quotation.validUntil) < new Date()
  const canSendEmails = !["cancelada", "cerrada"].includes(quotation.status)
  const hasResponses = quotation.supplierTokens?.some((t) => t.used)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/quotations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                Cotización #{quotation.code}
              </h1>
              <Badge className={status.color}>{status.label}</Badge>
              {isExpired && quotation.status !== "cerrada" && quotation.status !== "cancelada" && (
                <Badge variant="destructive">Expirada</Badge>
              )}
            </div>
            {quotation.description && (
              <p className="text-muted-foreground mt-1">{quotation.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {hasResponses && (
            <Link href={`/quotations/${quotationId}/comparison`}>
              <Button variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                Ver Comparación
              </Button>
            </Link>
          )}
          {canSendEmails && (
            <>
              <Button onClick={handleSendAllEmails} disabled={sendingEmails}>
                {sendingEmails ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Enviar a Todos
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cancelar cotización?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Los proveedores ya no podrán responder.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No, mantener</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel}>
                      Sí, cancelar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha</p>
                    <p className="font-medium">
                      {format(new Date(quotation.date), "dd MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Válida hasta</p>
                    <p className={`font-medium ${isExpired ? "text-red-600" : ""}`}>
                      {format(new Date(quotation.validUntil), "dd MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Respuestas</p>
                    <p className="font-medium">
                      {quotation.supplierTokens?.filter((t) => t.used).length || 0} / {quotation.supplierTokens?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {quotation.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Notas para Proveedores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{quotation.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Productos ({quotation.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.product.code}
                      </TableCell>
                      <TableCell>{item.product.name}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.product.unit?.abbreviation || "pz"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Suppliers */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Proveedores
              </CardTitle>
              <CardDescription>
                Estado de envío y respuestas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quotation.supplierTokens?.map((token) => (
                <div
                  key={token.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{token.supplier.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {token.supplier.email}
                      </p>
                    </div>
                    {token.used ? (
                      <Badge className="bg-green-100 text-green-800 shrink-0">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Respondió
                      </Badge>
                    ) : token.emailSent ? (
                      <Badge variant="outline" className="shrink-0">
                        <Mail className="mr-1 h-3 w-3" />
                        Enviado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        Pendiente
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-3 text-xs text-muted-foreground space-y-1">
                    {token.emailSentAt && (
                      <p>
                        Enviado: {format(new Date(token.emailSentAt), "dd/MM/yyyy HH:mm")}
                      </p>
                    )}
                    {token.usedAt && (
                      <p>
                        Respondió: {format(new Date(token.usedAt), "dd/MM/yyyy HH:mm")}
                      </p>
                    )}
                  </div>

                  {canSendEmails && !token.used && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => handleSendToSupplier(token.supplierId)}
                      disabled={sendingToSupplier === token.supplierId}
                    >
                      {sendingToSupplier === token.supplierId ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-3 w-3" />
                      )}
                      {token.emailSent ? "Reenviar Correo" : "Enviar Correo"}
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
