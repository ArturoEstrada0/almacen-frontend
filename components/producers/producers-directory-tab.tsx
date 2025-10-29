"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Search, Edit, Eye, DollarSign } from "lucide-react"
import { apiGet, apiPost } from "@/lib/db/localApi"
import { formatCurrency } from "@/lib/utils/format"

export function ProducersDirectoryTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [producers, setProducers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const data = await apiGet("/producers")
        if (mounted) setProducers(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Error loading producers:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  // Form state for creating producer
  const [formCode, setFormCode] = useState("")
  const [formName, setFormName] = useState("")
  const [formRfc, setFormRfc] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formCity, setFormCity] = useState("")
  const [formState, setFormState] = useState("")

  const handleCreateProducer = async () => {
    try {
      setSaving(true)
      const payload = {
        code: formCode || `PROD-${Date.now()}`,
        name: formName,
        taxId: formRfc,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        city: formCity,
        state: formState,
      }
      const created = await apiPost("/producers", payload)
      setProducers((prev) => [created, ...prev])
      setIsDialogOpen(false)
      // reset form
      setFormCode("")
      setFormName("")
      setFormRfc("")
      setFormPhone("")
      setFormEmail("")
      setFormAddress("")
      setFormCity("")
      setFormState("")
    } catch (err) {
      console.error("Error creating producer:", err)
      alert("Error creando productor: " + (err as any)?.message || String(err))
    } finally {
      setSaving(false)
    }
  }

  const filteredProducers = producers.filter(
    (producer) =>
      (producer.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (producer.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (producer.city || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Directorio de Productores</CardTitle>
            <CardDescription>Gestiona la información de tus productores</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Productor
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo Productor</DialogTitle>
                <DialogDescription>Registra un nuevo productor en el sistema</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código</Label>
                    <Input id="code" placeholder="PROD-004" value={formCode} onChange={(e) => setFormCode(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input id="name" placeholder="Nombre del productor" value={formName} onChange={(e) => setFormName(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rfc">RFC</Label>
                    <Input id="rfc" placeholder="ABCD123456XYZ" value={formRfc} onChange={(e) => setFormRfc(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" placeholder="+52 123 456 7890" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="productor@email.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" placeholder="Rancho, Parcela, etc." value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input id="city" placeholder="Ciudad" value={formCity} onChange={(e) => setFormCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input id="state" placeholder="Estado" value={formState} onChange={(e) => setFormState(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Nombre de Contacto</Label>
                  <Input id="contact" placeholder="Persona de contacto" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateProducer} disabled={saving || !formName}>
                  {saving ? "Guardando..." : "Guardar Productor"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, código o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducers.map((producer) => (
                <TableRow key={producer.id}>
                  <TableCell className="font-medium">{producer.code}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{producer.name}</div>
                      {producer.rfc && <div className="text-sm text-muted-foreground">{producer.rfc}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{producer.city}</div>
                      <div className="text-muted-foreground">{producer.state}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{producer.phone}</div>
                      {producer.email && <div className="text-muted-foreground">{producer.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span
                        className={
                          producer.accountBalance > 0
                            ? "font-semibold text-green-600"
                            : producer.accountBalance < 0
                              ? "font-semibold text-red-600"
                              : "text-muted-foreground"
                        }
                      >
                        {formatCurrency(Math.abs(producer.accountBalance))}
                      </span>
                      {Number(producer.accountBalance) > 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          A favor
                        </Badge>
                      )}
                      {Number(producer.accountBalance) < 0 && (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          En contra
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={producer.isActive ? "default" : "secondary"}>
                      {producer.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
