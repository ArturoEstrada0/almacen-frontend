"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { useProducts } from "@/lib/hooks/use-products"
import { useMovements, createMovement } from "@/lib/hooks/use-inventory"
import { useInventoryByWarehouse } from "@/lib/hooks/use-inventory"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { Search, Plus, ArrowUpCircle, ArrowDownCircle, RefreshCw, ArrowRightLeft } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "@/lib/utils/toast"
import { mutate as globalMutate } from "swr"
import { api } from "@/lib/config/api"
import { ProtectedCreate } from "@/components/auth/protected-action"

interface MovementsTabProps {
  warehouseId?: string
}

export function MovementsTab({ warehouseId }: MovementsTabProps) {
  const [movementTab, setMovementTab] = useState("history")
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const { movements, mutate: mutateMovements } = useMovements({ warehouseId })
  const { products } = useProducts()
  const { warehouses } = useWarehouses()
  const { mutate: mutateInventory } = useInventoryByWarehouse(warehouseId || null)

  // Pre-fill warehouseId with the first available warehouse (helps UX)
  useEffect(() => {
    if ((!form.warehouseId || form.warehouseId === "") && warehouses && warehouses.length > 0) {
      setForm((f) => ({ ...f, warehouseId: warehouses[0].id }))
    }
  }, [warehouses])

  const filteredMovements = (movements || []).filter((movement) => {
    const mv: any = movement
    const matchesSearch =
      (mv.items?.[0]?.product?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (movement.warehouse?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mv.items?.[0]?.lotNumber || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || movement.type === typeFilter
    const matchesWarehouse = !warehouseId || movement.warehouseId === warehouseId
    return matchesSearch && matchesType && matchesWarehouse
  })

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entrada":
        return <ArrowDownCircle className="h-4 w-4" />
      case "salida":
        return <ArrowUpCircle className="h-4 w-4" />
      case "ajuste":
        return <RefreshCw className="h-4 w-4" />
      case "traspaso":
        return <ArrowRightLeft className="h-4 w-4" />
      default:
        return null
    }
  }

  const getMovementColor = (type: string) => {
    switch (type) {
      case "entrada":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "salida":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      case "ajuste":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "traspaso":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400"
      default:
        return ""
    }
  }

  // New movement form state
  const [form, setForm] = useState({
    type: "entrada",
    warehouseId: warehouseId || "",
    productId: "",
    quantity: 0,
    lotNumber: "",
    unitCost: 0,
    notes: "",
  })
  // String inputs for decimal handling
  const [quantityInput, setQuantityInput] = useState<string>("")
  const [unitCostInput, setUnitCostInput] = useState<string>("")

  // Transfer form state (controlled)
  const [transferFrom, setTransferFrom] = useState<string>("")
  const [transferTo, setTransferTo] = useState<string>("")
  const [transferProduct, setTransferProduct] = useState<string>("")
  const [transferQuantity, setTransferQuantity] = useState<number>(0)
  const [transferQuantityInput, setTransferQuantityInput] = useState<string>("")
  const [transferLot, setTransferLot] = useState<string>("")
  const [transferNotes, setTransferNotes] = useState<string>("")

  // Prefill transfer defaults when warehouses load
  useEffect(() => {
    if (warehouses && warehouses.length > 0) {
      setTransferFrom((v) => (v ? v : warehouses[0].id))
      setTransferTo((v) => (v ? v : warehouses.length > 1 ? warehouses[1].id : warehouses[0].id))
    }
  }, [warehouses])

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Basic client-side validation to prevent empty/invalid payloads
      if (!form.warehouseId) {
        console.error("Warehouse is required")
        return
      }
      if (!form.productId) {
        console.error("Product is required")
        return
      }
      // simple UUID-ish check
      if (!/^[0-9a-fA-F-]{36}$/.test(form.productId)) {
        console.error("Product ID must be a valid UUID", form.productId)
        return
      }
      if (!form.quantity || Number(form.quantity) <= 0) {
        console.error("Quantity must be greater than zero")
        return
      }

      const loading = toast.loading("Registrando movimiento...")
      try {
        await createMovement({
          type: form.type as any,
          warehouseId: form.warehouseId,
          referenceNumber: form.lotNumber,
          notes: form.notes,
          items: [
            {
              productId: form.productId,
              quantity: Number(form.quantity),
              unitId: "",
              fromLocationId: undefined,
              toLocationId: undefined,
              lotNumber: form.lotNumber,
              unitCost: form.unitCost,
            },
          ],
        })

      // refresh movements and inventory, wait for completion
      await mutateMovements()

      // Ensure inventory for the warehouse is revalidated even if the
      // local useInventoryByWarehouse hook was initialized with `null`.
      if (form.warehouseId) {
        await globalMutate(`/inventory/warehouse/${form.warehouseId}`)
      }

      // Also revalidate movements list (global key) to ensure history updates
      if (form.warehouseId) {
        await globalMutate(`/inventory/movements?warehouseId=${form.warehouseId}`)
      } else {
        await globalMutate(`/inventory/movements?`)
      }

      // Debug: fetch the latest data and print to console to help trace why UI
      // might not be rendering new rows. The user can paste these logs if needed.
      try {
        if (form.warehouseId) {
          const inv = await api.get(`/inventory/warehouse/${form.warehouseId}`)
          console.debug("[debug] inventory response:", inv)
          const mov = await api.get(`/inventory/movements?warehouseId=${form.warehouseId}`)
          console.debug("[debug] movements response:", mov)
        } else {
          const movAll = await api.get(`/inventory/movements?`)
          console.debug("[debug] movements response:", movAll)
        }
      } catch (err) {
        console.error("[debug] error fetching debug endpoints", err)
      }

      toast.success("Movimiento registrado")

  // reset minimal fields
  setForm((f) => ({ ...f, productId: "", quantity: 0, lotNumber: "", notes: "" }))
  setQuantityInput("")
  setUnitCostInput("")
      } catch (err: any) {
        const msg = err?.message || "Error al crear movimiento"
        toast.error("Error creando movimiento", String(msg))
        console.error("Error creating movement", err)
      } finally {
        // dismiss loading (sonner's loading toast is auto-replaced by next toast)
      }
    } catch (err) {
      console.error("Error creating movement", err)
    }
  }

  return (
    <Tabs value={movementTab} onValueChange={setMovementTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="history">Historial</TabsTrigger>
        <TabsTrigger value="new">Nuevo Movimiento</TabsTrigger>
        <TabsTrigger value="transfer">Traspasos</TabsTrigger>
        <TabsTrigger value="adjustment">Ajustes</TabsTrigger>
      </TabsList>

      <TabsContent value="history" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Historial de Movimientos</CardTitle>
            <CardDescription>Registro completo de todas las operaciones de inventario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por producto, almacén o lote..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tipo de movimiento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="salida">Salidas</SelectItem>
                  <SelectItem value="ajuste">Ajustes</SelectItem>
                  <SelectItem value="traspaso">Traspasos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Almacén</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="text-right">Costo Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((movement, index) => (
                    <motion.tr
                      key={movement.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group"
                    >
                      <TableCell className="font-medium">{formatDate(movement.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getMovementColor(movement.type)}>
                          <span className="flex items-center gap-1">
                            {getMovementIcon(movement.type)}
                            {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>{(movement as any).items?.[0]?.product?.name}</TableCell>
                      <TableCell>{movement.warehouse?.name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {movement.type === "salida" ? "-" : "+"}
                        {(movement as any).items?.[0]?.quantity}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{movement.lotNumber || "-"}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{movement.userName || "-"}</TableCell>
                      <TableCell className="text-right">
                        {(movement as any).total ? formatCurrency((movement as any).total) : "-"}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="new" className="space-y-4">
        <ProtectedCreate module="movements">
          <Card>
            <CardHeader>
            <CardTitle>Registrar Nuevo Movimiento</CardTitle>
            <CardDescription>Registra entradas o salidas de inventario</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateMovement}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="movement-type">Tipo de Movimiento</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger id="movement-type">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="salida">Salida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warehouse">Almacén</Label>
                  <Select value={form.warehouseId} onValueChange={(v) => setForm((f) => ({ ...f, warehouseId: v }))}>
                    <SelectTrigger id="warehouse">
                      <SelectValue placeholder="Seleccionar almacén" />
                    </SelectTrigger>
                    <SelectContent>
                      {(warehouses || []).map((warehouse: any, index: number) => (
                        <SelectItem key={`new-wh-${warehouse.id || index}`} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product">Producto</Label>
                  <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
                    <SelectTrigger id="product">
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input 
                    id="quantity" 
                    type="text" 
                    inputMode="decimal"
                    placeholder="0" 
                    value={quantityInput} 
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permitir números, punto decimal y entrada vacía
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setQuantityInput(value)
                        setForm((f) => ({ ...f, quantity: value === '' ? 0 : parseFloat(value) || 0 }))
                      }
                    }} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lot">Número de Lote</Label>
                  <Input id="lot" placeholder="LOT-2024-001" value={form.lotNumber} onChange={(e) => setForm((f) => ({ ...f, lotNumber: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit-cost">Costo Unitario</Label>
                  <Input 
                    id="unit-cost" 
                    type="text" 
                    inputMode="decimal"
                    placeholder="0.00" 
                    value={unitCostInput} 
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permitir números, punto decimal y entrada vacía
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setUnitCostInput(value)
                        setForm((f) => ({ ...f, unitCost: value === '' ? 0 : parseFloat(value) || 0 }))
                      }
                    }} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Información adicional sobre el movimiento..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => {
                  setForm({ type: "entrada", warehouseId: warehouseId || "", productId: "", quantity: 0, lotNumber: "", unitCost: 0, notes: "" })
                  setQuantityInput("")
                  setUnitCostInput("")
                }}>Cancelar</Button>
                <Button type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Movimiento
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </ProtectedCreate>
      </TabsContent>

      <TabsContent value="transfer" className="space-y-4">
        <ProtectedCreate module="movements">
          <Card>
            <CardHeader>
            <CardTitle>Traspaso entre Almacenes</CardTitle>
            <CardDescription>Transfiere productos de un almacén a otro</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Transfer form: controlled and wired to backend */}
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()
                // basic validation
                if (!transferFrom || !transferTo) {
                  toast.error("Debe seleccionar origen y destino")
                  return
                }
                if (!transferProduct) {
                  toast.error("Debe seleccionar un producto")
                  return
                }
                if (!transferQuantity || Number(transferQuantity) <= 0) {
                  toast.error("Cantidad debe ser mayor que 0")
                  return
                }

                try {
                  const loading = toast.loading("Registrando traspaso...")

                  await createMovement({
                    type: "traspaso",
                    warehouseId: transferFrom,
                    destinationWarehouseId: transferTo as any,
                    notes: transferNotes || undefined,
                    items: [
                      {
                        productId: transferProduct,
                        quantity: Number(transferQuantity),
                        lotNumber: transferLot || undefined,
                      },
                    ],
                  } as any)

                  // revalidate movements and inventory for both warehouses
                  await mutateMovements()
                  if (transferFrom) await globalMutate(`/inventory/warehouse/${transferFrom}`)
                  if (transferTo) await globalMutate(`/inventory/warehouse/${transferTo}`)
                  await globalMutate(`/inventory/movements?warehouseId=${transferFrom}`)
                  // Also refresh global warehouses list so pages that join warehouses+inventory update
                  await globalMutate("warehouses")

                  toast.success("Traspaso registrado")

                  // reset transfer form
                  setTransferFrom(warehouses && warehouses.length > 0 ? warehouses[0].id : "")
                  setTransferTo(warehouses && warehouses.length > 1 ? warehouses[1].id : "")
                  setTransferProduct("")
                  setTransferQuantity(0)
                  setTransferQuantityInput("")
                  setTransferLot("")
                  setTransferNotes("")
                } catch (err: any) {
                  console.error("Error creating transfer", err)
                  toast.error("Error creando traspaso: " + (err?.message || "Error"))
                }
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="from-warehouse">Almacén Origen</Label>
                  <Select value={transferFrom} onValueChange={(v) => setTransferFrom(v)}>
                    <SelectTrigger id="from-warehouse">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(warehouses || []).map((warehouse: any, index: number) => (
                        <SelectItem key={`from-${warehouse.id || index}`} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to-warehouse">Almacén Destino</Label>
                  <Select value={transferTo} onValueChange={(v) => setTransferTo(v)}>
                    <SelectTrigger id="to-warehouse">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(warehouses || []).map((warehouse: any, index: number) => (
                        <SelectItem key={`to-${warehouse.id || index}`} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="transfer-product">Producto</Label>
                  <Select value={transferProduct} onValueChange={(v) => setTransferProduct(v)}>
                    <SelectTrigger id="transfer-product">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transfer-quantity">Cantidad a Transferir</Label>
                  <Input 
                    id="transfer-quantity" 
                    type="text" 
                    inputMode="decimal"
                    placeholder="0" 
                    value={transferQuantityInput} 
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permitir números, punto decimal y entrada vacía
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setTransferQuantityInput(value)
                        setTransferQuantity(value === '' ? 0 : parseFloat(value) || 0)
                      }
                    }} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transfer-lot">Número de Lote</Label>
                  <Input id="transfer-lot" placeholder="LOT-2024-001" value={transferLot} onChange={(e) => setTransferLot(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer-notes">Motivo del Traspaso</Label>
                <Textarea id="transfer-notes" placeholder="Describe el motivo del traspaso..." value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => {
                  // simple reset
                  setTransferFrom(warehouses && warehouses.length > 0 ? warehouses[0].id : "")
                  setTransferTo(warehouses && warehouses.length > 1 ? warehouses[1].id : "")
                  setTransferProduct("")
                  setTransferQuantity(0)
                  setTransferQuantityInput("")
                  setTransferLot("")
                  setTransferNotes("")
                }}>Cancelar</Button>
                <Button type="submit">
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Realizar Traspaso
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </ProtectedCreate>
      </TabsContent>

      <TabsContent value="adjustment" className="space-y-4">
        <ProtectedCreate module="movements">
          <Card>
            <CardHeader>
              <CardTitle>Ajuste de Inventario</CardTitle>
              <CardDescription>Corrige diferencias en el inventario físico vs sistema</CardDescription>
            </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adj-warehouse">Almacén</Label>
                  <Select>
                    <SelectTrigger id="adj-warehouse">
                      <SelectValue placeholder="Seleccionar almacén" />
                    </SelectTrigger>
                    <SelectContent>
                      {(warehouses || []).map((warehouse: any, index: number) => (
                        <SelectItem key={`adj-${warehouse.id || index}`} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adj-product">Producto</Label>
                  <Select>
                    <SelectTrigger id="adj-product">
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product, index) => (
                        <SelectItem key={`adj-prod-${product.id || index}`} value={product.id}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="system-qty">Cantidad en Sistema</Label>
                  <Input id="system-qty" type="number" placeholder="0" disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="physical-qty">Cantidad Física</Label>
                  <Input id="physical-qty" type="number" placeholder="0" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="difference">Diferencia</Label>
                  <Input id="difference" type="number" placeholder="0" disabled className="font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adj-reason">Motivo del Ajuste</Label>
                <Textarea id="adj-reason" placeholder="Explica el motivo del ajuste de inventario..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancelar</Button>
                <Button>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Aplicar Ajuste
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </ProtectedCreate>
      </TabsContent>
    </Tabs>
  )
}
