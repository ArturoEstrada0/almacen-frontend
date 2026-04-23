"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Customer } from "@/lib/hooks/use-customers"
import { Switch } from "@/components/ui/switch"

export interface CustomerFormData {
  customerCode: string
  customerType: "nacional" | "extranjero"
  rfc?: string
  name: string
  businessType?: string
  street: string
  streetNumber: string
  neighborhood?: string
  city: string
  state: string
  country?: string
  postalCode: string
  phone: string
  email: string
  contactName?: string
  paymentMethod: "cash" | "bank_transfer" | "check" | "credit"
  creditDays: number
  bankName?: string
  accountNumber?: string
  clabe?: string
  notes?: string
}

interface CustomerFormProps {
  initialData?: Customer
  onSubmit: (data: CustomerFormData) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

const MEXICAN_STATES = [
  "CDMX",
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Coahuila",
  "Colima",
  "Chiapas",
  "Chihuahua",
  "Durango",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "México",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
]

const CUSTOMER_DRAFT_KEY = "customer-form-draft-v3"

export function CustomerForm({ initialData, onSubmit, isLoading = false, error }: CustomerFormProps) {
  const [showPaymentFields, setShowPaymentFields] = useState<boolean>(
    Boolean(
      initialData?.bankName ||
        initialData?.clabe ||
        initialData?.accountNumber ||
        (initialData?.paymentMethod && initialData.paymentMethod !== "cash"),
    ),
  )
  const buildInitialForm = (data?: Customer): CustomerFormData => ({
    customerCode: data?.customerCode ?? "",
    customerType: (data as any)?.customerType ?? "nacional",
    rfc: data?.rfc ?? "",
    name: data?.name ?? "",
    businessType: data?.businessType ?? "",
    street: data?.street ?? "",
    streetNumber: data?.streetNumber ?? "",
    neighborhood: data?.neighborhood ?? "",
    city: data?.city ?? "",
    state: data?.state ?? "",
    country: (data as any)?.country ?? "México",
    postalCode: data?.postalCode ?? "",
    phone: data?.phone ?? "",
    email: data?.email ?? "",
    contactName: data?.contactName ?? "",
    paymentMethod: (data?.paymentMethod as any) ?? "bank_transfer",
    creditDays: typeof data?.creditDays === "number" ? data!.creditDays : 0,
    bankName: data?.bankName ?? "",
    accountNumber: data?.accountNumber ?? "",
    clabe: data?.clabe ?? "",
    notes: data?.notes ?? "",
  })

  const [formData, setFormData] = useState<CustomerFormData>(buildInitialForm(initialData))

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(error || null)

  useEffect(() => {
    setSubmitError(error || null)
  }, [error])

  useEffect(() => {
    if (initialData) {
      setFormData(buildInitialForm(initialData))
      setShowPaymentFields(
        Boolean(
          initialData.bankName || initialData.clabe || initialData.accountNumber || (initialData.paymentMethod && initialData.paymentMethod !== "cash"),
        ),
      )
    }
  }, [initialData])

  useEffect(() => {
    if (initialData || typeof window === "undefined") return

    const draft = window.localStorage.getItem(CUSTOMER_DRAFT_KEY)
    if (!draft) return

    try {
      const parsed = JSON.parse(draft)
      if (parsed?.formData) {
        setFormData((prev) => ({ ...prev, ...parsed.formData }))
      }
      if (typeof parsed?.showPaymentFields === "boolean") {
        setShowPaymentFields(parsed.showPaymentFields)
      }
    } catch {
      window.localStorage.removeItem(CUSTOMER_DRAFT_KEY)
    }
  }, [initialData])

  useEffect(() => {
    if (initialData || typeof window === "undefined") return

    window.localStorage.setItem(
      CUSTOMER_DRAFT_KEY,
      JSON.stringify({ formData, showPaymentFields }),
    )
  }, [formData, showPaymentFields, initialData])

  const validateRFC = (rfc: string): boolean => {
    const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/
    return rfcRegex.test(rfc.toUpperCase())
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/[\s\-()]/g, "")
    const phoneRegex = /^(\+?52)?1?\d{10}$/
    return phoneRegex.test(cleanPhone)
  }

  const validateCLABE = (clabe: string): boolean => {
    if (!clabe) return true // CLABE es opcional
    
    const clabeRegex = /^\d{18}$/
    if (!clabeRegex.test(clabe)) return false

    // Validar dígito de control (Luhn)
    let sum = 0
    const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1]

    for (let i = 0; i < 17; i++) {
      const digit = parseInt(clabe[i], 10)
      const product = (digit * weights[i]) % 10
      sum = (sum + product) % 10
    }

    const checkDigit = (10 - sum) % 10
    return checkDigit === parseInt(clabe[17], 10)
  }

  const validatePostalCode = (code: string): boolean => {
    return /^\d{5}$/.test(code)
  }

  const handleFieldChange = (field: keyof CustomerFormData, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }

      if (field === "customerType") {
        if (value === "nacional") {
          next.country = "México"
        } else if (!next.country) {
          next.country = ""
        }
      }

      return next
    })

    // Limpiar error de validación del campo al escribir
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const { [field]: _, ...rest } = prev
        return rest
      })
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.customerCode) {
      errors.customerCode = "ID de cliente es requerido"
    }

    if (formData.rfc && !validateRFC(formData.rfc)) {
      errors.rfc = "RFC inválido. Formato: XXXXXX######XXX (12-13 caracteres)"
    }

    if (!formData.name) {
      errors.name = "Nombre o Razón Social es requerido"
    }

    if (!formData.customerType) {
      errors.customerType = "Debe seleccionar si el cliente es nacional o extranjero"
    }

    if (!formData.street) {
      errors.street = "Calle es requerida"
    }

    if (!formData.streetNumber) {
      errors.streetNumber = "Número de calle es requerido"
    }

    if (!formData.city) {
      errors.city = "Ciudad es requerida"
    }

    if (formData.customerType === "nacional") {
      if (!formData.state) {
        errors.state = "Estado es requerido"
      }

      if (!formData.postalCode) {
        errors.postalCode = "Código postal es requerido"
      } else if (!validatePostalCode(formData.postalCode)) {
        errors.postalCode = "Código postal inválido (debe ser 5 dígitos)"
      }
    } else {
      if (!formData.country) {
        errors.country = "País es requerido para clientes extranjeros"
      }
    }

    if (!formData.phone) {
      errors.phone = "Teléfono es requerido"
    } else if (!validatePhone(formData.phone)) {
      errors.phone = "Teléfono inválido. Debe contener 10 dígitos"
    }

    if (!formData.email) {
      errors.email = "Email es requerido"
    } else if (!validateEmail(formData.email)) {
      errors.email = "Email inválido"
    }

    if (showPaymentFields) {
      if (formData.paymentMethod === "bank_transfer") {
        if (!formData.bankName) {
          errors.bankName = "Nombre del banco es requerido para transferencia bancaria"
        }
        if (!formData.clabe) {
          errors.clabe = "CLABE es requerida para transferencia bancaria"
        } else if (!validateCLABE(formData.clabe)) {
          errors.clabe = "CLABE inválida (debe ser 18 dígitos)"
        }
      } else if (formData.clabe && !validateCLABE(formData.clabe)) {
        errors.clabe = "CLABE inválida (debe ser 18 dígitos)"
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validateForm()) {
      setSubmitError("Por favor corrija los errores en el formulario")
      return
    }

    try {
      // Si no se desean datos de pago, limpiarlos antes de enviar
      const payload = showPaymentFields
        ? formData
        : { ...formData, paymentMethod: "cash", bankName: "", accountNumber: "", clabe: "", creditDays: 0 }

      await onSubmit(payload)
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CUSTOMER_DRAFT_KEY)
      }
    } catch (err: any) {
      setSubmitError(err.message || "Error al guardar cliente")
    }
  }

  const handleReset = () => {
    const initial = buildInitialForm(initialData)
    setFormData(initial)
    setValidationErrors({})
    setSubmitError(null)
    setShowPaymentFields(
      Boolean(
        initialData?.bankName ||
          initialData?.clabe ||
          initialData?.accountNumber ||
          (initialData?.paymentMethod && initialData.paymentMethod !== "cash"),
      ),
    )

    if (typeof window !== "undefined" && !initialData) {
      window.localStorage.removeItem(CUSTOMER_DRAFT_KEY)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Identificación */}
      <Card>
        <CardHeader>
          <CardTitle>Identificación del Cliente</CardTitle>
          <CardDescription>Información de identificación del cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerType">Tipo de Cliente *</Label>
              <Select
                value={formData.customerType}
                onValueChange={(value: any) => handleFieldChange("customerType", value)}
              >
                <SelectTrigger className={validationErrors.customerType ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nacional">Nacional</SelectItem>
                  <SelectItem value="extranjero">Extranjero</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.customerType && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.customerType}</p>
              )}
            </div>

            <div>
              <Label htmlFor="customerCode">ID de Cliente *</Label>
              <Input
                id="customerCode"
                placeholder="CLI-0001"
                value={formData.customerCode}
                onChange={(e) => handleFieldChange("customerCode", e.target.value.toUpperCase())}
                className={validationErrors.customerCode ? "border-red-500" : ""}
                maxLength={20}
              />
              {validationErrors.customerCode && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.customerCode}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Identificador interno del cliente</p>
            </div>

            <div>
              <Label htmlFor="name">Nombre o Razón Social *</Label>
              <Input
                id="name"
                placeholder="ABC Soluciones S.A. de C.V."
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className={validationErrors.name ? "border-red-500" : ""}
              />
              {validationErrors.name && <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>}
            </div>

            <div>
              <Label htmlFor="businessType">Tipo de Negocio</Label>
              <Input
                id="businessType"
                placeholder="Ej: Distribuidora de Alimentos"
                value={formData.businessType}
                onChange={(e) => handleFieldChange("businessType", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="rfc">RFC</Label>
              <Input
                id="rfc"
                placeholder="ABC123456XYZ"
                value={formData.rfc}
                onChange={(e) => handleFieldChange("rfc", e.target.value.toUpperCase())}
                className={validationErrors.rfc ? "border-red-500" : ""}
                maxLength={13}
              />
              {validationErrors.rfc && <p className="text-sm text-red-500 mt-1">{validationErrors.rfc}</p>}
              <p className="text-xs text-gray-500 mt-1">Opcional. Formato: XXXXXX######XXX (12-13 caracteres)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dirección */}
      <Card>
        <CardHeader>
          <CardTitle>Dirección</CardTitle>
          <CardDescription>Domicilio del cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="street">Calle *</Label>
              <Input
                id="street"
                placeholder="Avenida Revolución"
                value={formData.street}
                onChange={(e) => handleFieldChange("street", e.target.value)}
                className={validationErrors.street ? "border-red-500" : ""}
              />
              {validationErrors.street && <p className="text-sm text-red-500 mt-1">{validationErrors.street}</p>}
            </div>

            <div>
              <Label htmlFor="streetNumber">Número *</Label>
              <Input
                id="streetNumber"
                placeholder="1234"
                value={formData.streetNumber}
                onChange={(e) => handleFieldChange("streetNumber", e.target.value)}
                className={validationErrors.streetNumber ? "border-red-500" : ""}
              />
              {validationErrors.streetNumber && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.streetNumber}</p>
              )}
            </div>

            <div>
              <Label htmlFor="neighborhood">Colonia</Label>
              <Input
                id="neighborhood"
                placeholder="Centro"
                value={formData.neighborhood}
                onChange={(e) => handleFieldChange("neighborhood", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                placeholder={formData.customerType === "extranjero" ? "Los Ángeles" : "México"}
                value={formData.city}
                onChange={(e) => handleFieldChange("city", e.target.value)}
                className={validationErrors.city ? "border-red-500" : ""}
              />
              {validationErrors.city && <p className="text-sm text-red-500 mt-1">{validationErrors.city}</p>}
            </div>

            {formData.customerType === "nacional" ? (
              <>
                <div>
                  <Label htmlFor="state">Estado *</Label>
                  <Select value={formData.state} onValueChange={(value) => handleFieldChange("state", value)}>
                    <SelectTrigger className={validationErrors.state ? "border-red-500" : ""}>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEXICAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.state && <p className="text-sm text-red-500 mt-1">{validationErrors.state}</p>}
                </div>

                <div>
                  <Label htmlFor="postalCode">Código Postal *</Label>
                  <Input
                    id="postalCode"
                    placeholder="06500"
                    value={formData.postalCode}
                    onChange={(e) => handleFieldChange("postalCode", e.target.value)}
                    className={validationErrors.postalCode ? "border-red-500" : ""}
                    maxLength={5}
                  />
                  {validationErrors.postalCode && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.postalCode}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="country">País *</Label>
                  <Input
                    id="country"
                    placeholder="Estados Unidos"
                    value={formData.country}
                    onChange={(e) => handleFieldChange("country", e.target.value)}
                    className={validationErrors.country ? "border-red-500" : ""}
                  />
                  {validationErrors.country && <p className="text-sm text-red-500 mt-1">{validationErrors.country}</p>}
                </div>

                <div>
                  <Label htmlFor="postalCode">Código Postal</Label>
                  <Input
                    id="postalCode"
                    placeholder="Opcional"
                    value={formData.postalCode}
                    onChange={(e) => handleFieldChange("postalCode", e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contacto */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Contacto</CardTitle>
          <CardDescription>Datos para comunicarse con el cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                placeholder="5551234567"
                value={formData.phone}
                onChange={(e) => handleFieldChange("phone", e.target.value.replace(/\D/g, ""))}
                className={validationErrors.phone ? "border-red-500" : ""}
                maxLength={13}
              />
              {validationErrors.phone && <p className="text-sm text-red-500 mt-1">{validationErrors.phone}</p>}
              <p className="text-xs text-gray-500 mt-1">Solo números, 10 dígitos</p>
            </div>

            <div>
              <Label htmlFor="email">Correo Electrónico *</Label>
              <Input
                id="email"
                type="email"
                placeholder="contacto@empresa.com"
                value={formData.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                className={validationErrors.email ? "border-red-500" : ""}
              />
              {validationErrors.email && <p className="text-sm text-red-500 mt-1">{validationErrors.email}</p>}
            </div>

            <div>
              <Label htmlFor="contactName">Nombre del Contacto</Label>
              <Input
                id="contactName"
                placeholder="Juan García Morales"
                value={formData.contactName}
                onChange={(e) => handleFieldChange("contactName", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos de Pago (opcional) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle>Datos de Pago</CardTitle>
              <CardDescription>Información de pago del cliente</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Agregar datos de pago</span>
              <Switch checked={showPaymentFields} onCheckedChange={(v: any) => setShowPaymentFields(Boolean(v))} />
            </div>
          </div>
        </CardHeader>

        {showPaymentFields && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentMethod">Forma de Pago *</Label>
                <Select value={formData.paymentMethod} onValueChange={(value: any) => handleFieldChange("paymentMethod", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="creditDays">Días de Crédito</Label>
                <Input
                  id="creditDays"
                  type="number"
                  min="0"
                  placeholder="30"
                  value={formData.creditDays}
                  onChange={(e) => handleFieldChange("creditDays", parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-gray-500 mt-1">0 = Al contado</p>
              </div>

              {formData.paymentMethod === "bank_transfer" && (
                <>
                  <div>
                    <Label htmlFor="bankName">Nombre del Banco *</Label>
                    <Input
                      id="bankName"
                      placeholder="Banco del Bajío"
                      value={formData.bankName}
                      onChange={(e) => handleFieldChange("bankName", e.target.value)}
                      className={validationErrors.bankName ? "border-red-500" : ""}
                    />
                    {validationErrors.bankName && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.bankName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="accountNumber">Número de Cuenta</Label>
                    <Input
                      id="accountNumber"
                      placeholder="123456789012345678"
                      value={formData.accountNumber}
                      onChange={(e) => handleFieldChange("accountNumber", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="clabe">CLABE (18 dígitos) *</Label>
                    <Input
                      id="clabe"
                      placeholder="012580000123456789"
                      value={formData.clabe}
                      onChange={(e) => handleFieldChange("clabe", e.target.value.replace(/\D/g, ""))}
                      className={validationErrors.clabe ? "border-red-500" : ""}
                      maxLength={18}
                    />
                    {validationErrors.clabe && <p className="text-sm text-red-500 mt-1">{validationErrors.clabe}</p>}
                  </div>
                </>
              )}
            </div>

            {formData.paymentMethod === "bank_transfer" && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Para pagos por transferencia bancaria, se requieren datos del banco y CLABE
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        )}
      </Card>

      {/* Notas */}
      <Card>
        <CardHeader>
          <CardTitle>Notas Adicionales</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            placeholder="Información adicional sobre el cliente..."
            value={formData.notes}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" type="button" onClick={handleReset}>
          Limpiar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : "Guardar Cliente"}
        </Button>
      </div>
    </form>
  )
}
