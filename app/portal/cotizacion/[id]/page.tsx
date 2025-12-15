"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle, Package, Calendar, Building2, AlertTriangle, Send, Clock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface QuotationItem {
  id: string
  productId: string
  quantity: number
  notes?: string
  product: {
    id: string
    code: string
    name: string
    unit?: {
      abbreviation: string
      name: string
    }
  }
}

interface Quotation {
  id: string
  code: string
  description?: string
  date: string
  validUntil: string
  notes?: string
  items: QuotationItem[]
}

interface Supplier {
  id: string
  name: string
  contactName?: string
}

interface ItemResponse {
  quotationItemId: string
  price: number
  currency: "MXN" | "USD"
  leadTimeDays?: number
  notes?: string
  available: boolean
}

export default function SupplierQuotationPortal() {
  const params = useParams()
  const searchParams = useSearchParams()
  const quotationId = params.id as string
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [alreadyResponded, setAlreadyResponded] = useState(false)
  const [responses, setResponses] = useState<Map<string, ItemResponse>>(new Map())

  useEffect(() => {
    fetchQuotation()
  }, [quotationId, token])

  const fetchQuotation = async () => {
    if (!token) {
      setError("Token de acceso no proporcionado")
      setLoading(false)
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(
        `${apiUrl}/api/quotations/portal/${quotationId}?token=${token}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al cargar la cotización")
      }

      const data = await response.json()
      setQuotation(data.quotation)
      setSupplier(data.supplier)
      setAlreadyResponded(data.alreadyResponded)

      // Inicializar respuestas
      const initialResponses = new Map<string, ItemResponse>()
      data.quotation.items.forEach((item: QuotationItem) => {
        // Si ya respondió, cargar respuestas previas
        if (data.alreadyResponded && data.previousResponses) {
          const prev = data.previousResponses.find(
            (r: any) => r.quotationItemId === item.id
          )
          if (prev) {
            initialResponses.set(item.id, {
              quotationItemId: item.id,
              price: Number(prev.price),
              currency: prev.currency || "MXN",
              leadTimeDays: prev.leadTimeDays,
              notes: prev.notes,
              available: prev.available,
            })
            return
          }
        }
        
        initialResponses.set(item.id, {
          quotationItemId: item.id,
          price: 0,
          currency: "MXN",
          leadTimeDays: undefined,
          notes: "",
          available: true,
        })
      })
      setResponses(initialResponses)
    } catch (err: any) {
      setError(err.message || "Error al cargar la cotización")
    } finally {
      setLoading(false)
    }
  }

  const updateResponse = (itemId: string, field: keyof ItemResponse, value: any) => {
    setResponses((prev) => {
      const newResponses = new Map(prev)
      const current = newResponses.get(itemId)
      if (current) {
        newResponses.set(itemId, { ...current, [field]: value })
      }
      return newResponses
    })
  }

  const handleSubmit = async () => {
    if (!token || !quotation) return

    // Validar que todos los productos disponibles tengan precio
    const items = Array.from(responses.values())
    const invalidItems = items.filter((item) => item.available && item.price <= 0)
    
    if (invalidItems.length > 0) {
      setError("Por favor ingrese el precio para todos los productos disponibles")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(
        `${apiUrl}/api/quotations/portal/${quotationId}/respond?token=${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ items }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al enviar la cotización")
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "Error al enviar la cotización")
    } finally {
      setSubmitting(false)
    }
  }

  const isExpired = quotation && new Date(quotation.validUntil) < new Date()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando cotización...</p>
        </div>
      </div>
    )
  }

  if (error && !quotation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Error de Acceso</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-gray-500">
            <p>El enlace puede haber expirado o ser inválido.</p>
            <p className="mt-2">Por favor contacte al solicitante para obtener un nuevo enlace.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">¡Cotización Enviada!</CardTitle>
            <CardDescription>
              Su cotización ha sido recibida correctamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-gray-500">
            <p>Recibirá un correo de confirmación en breve.</p>
            <p className="mt-2">Gracias por su pronta respuesta.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Portal de Cotizaciones
        </h1>
        <p className="text-gray-600">Sistema de Gestión MECER</p>
      </div>

      {/* Supplier Info */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Bienvenido, {supplier?.contactName || supplier?.name}
              </CardTitle>
              <CardDescription>{supplier?.name}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quotation Info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Cotización #{quotation?.code}
                {isExpired && (
                  <Badge variant="destructive">Expirada</Badge>
                )}
                {alreadyResponded && !isExpired && (
                  <Badge variant="secondary">Ya Respondida</Badge>
                )}
              </CardTitle>
              {quotation?.description && (
                <CardDescription className="mt-1">
                  {quotation.description}
                </CardDescription>
              )}
            </div>
            <div className="flex flex-col text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Fecha: {quotation && format(new Date(quotation.date), "dd MMM yyyy", { locale: es })}
              </span>
              <span className="flex items-center gap-1 text-orange-600">
                <Clock className="h-4 w-4" />
                Válida hasta: {quotation && format(new Date(quotation.validUntil), "dd MMM yyyy", { locale: es })}
              </span>
            </div>
          </div>
        </CardHeader>
        {quotation?.notes && (
          <CardContent className="pt-0">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Notas del solicitante</AlertTitle>
              <AlertDescription>{quotation.notes}</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Products List */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos Solicitados
          </CardTitle>
          <CardDescription>
            Ingrese el precio unitario para cada producto. Marque como "No disponible" si no puede cotizar algún producto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {quotation?.items.map((item, index) => {
            const response = responses.get(item.id)
            if (!response) return null

            return (
              <div
                key={item.id}
                className={`p-4 rounded-lg border ${
                  response.available
                    ? "bg-white border-gray-200"
                    : "bg-gray-50 border-gray-300"
                }`}
              >
                {/* Product Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {item.product.code}
                      </span>
                      <h4 className="font-medium text-gray-900">
                        {item.product.name}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Cantidad solicitada:{" "}
                      <span className="font-semibold text-gray-900">
                        {item.quantity} {item.product.unit?.abbreviation || "pz"}
                      </span>
                    </p>
                    {item.notes && (
                      <p className="text-sm text-blue-600 mt-1">
                        Nota: {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`available-${item.id}`}
                      checked={response.available}
                      onCheckedChange={(checked) =>
                        updateResponse(item.id, "available", checked)
                      }
                      disabled={isExpired}
                    />
                    <Label
                      htmlFor={`available-${item.id}`}
                      className="text-sm cursor-pointer"
                    >
                      Disponible
                    </Label>
                  </div>
                </div>

                {/* Price Inputs */}
                {response.available && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor={`price-${item.id}`}>
                        Precio Unitario *
                      </Label>
                      <div className="flex mt-1">
                        <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                          $
                        </span>
                        <Input
                          id={`price-${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={response.price || ""}
                          onChange={(e) =>
                            updateResponse(
                              item.id,
                              "price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="rounded-l-none"
                          placeholder="0.00"
                          disabled={isExpired}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`currency-${item.id}`}>Moneda</Label>
                      <Select
                        value={response.currency}
                        onValueChange={(value) =>
                          updateResponse(item.id, "currency", value)
                        }
                        disabled={isExpired}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MXN">MXN (Pesos)</SelectItem>
                          <SelectItem value="USD">USD (Dólares)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`leadtime-${item.id}`}>
                        Tiempo de Entrega (días)
                      </Label>
                      <Input
                        id={`leadtime-${item.id}`}
                        type="number"
                        min="0"
                        value={response.leadTimeDays || ""}
                        onChange={(e) =>
                          updateResponse(
                            item.id,
                            "leadTimeDays",
                            parseInt(e.target.value) || undefined
                          )
                        }
                        className="mt-1"
                        placeholder="Opcional"
                        disabled={isExpired}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`notes-${item.id}`}>Notas</Label>
                      <Input
                        id={`notes-${item.id}`}
                        value={response.notes || ""}
                        onChange={(e) =>
                          updateResponse(item.id, "notes", e.target.value)
                        }
                        className="mt-1"
                        placeholder="Opcional"
                        disabled={isExpired}
                      />
                    </div>
                  </div>
                )}

                {!response.available && (
                  <p className="text-sm text-gray-500 italic">
                    Este producto no está disponible para cotizar.
                  </p>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Submit Button */}
      {!isExpired && (
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={submitting}
            className="min-w-[200px]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {alreadyResponded ? "Actualizar Cotización" : "Enviar Cotización"}
              </>
            )}
          </Button>
        </div>
      )}

      {isExpired && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cotización Expirada</AlertTitle>
          <AlertDescription>
            El plazo para responder esta cotización ha vencido. Por favor contacte al solicitante si desea enviar una propuesta.
          </AlertDescription>
        </Alert>
      )}

      {/* Footer */}
      <div className="text-center mt-8 text-sm text-gray-500">
        <p>© {new Date().getFullYear()} MECER. Todos los derechos reservados.</p>
      </div>
    </div>
  )
}
