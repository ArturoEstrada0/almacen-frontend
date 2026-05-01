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
import { ComboBox } from "@/components/ui/combobox"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { useProducts } from "@/lib/hooks/use-products"
import { useMovements, createMovement } from "@/lib/hooks/use-inventory"
import { useInventoryByWarehouse } from "@/lib/hooks/use-inventory"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { Search, Plus, ArrowUpCircle, ArrowDownCircle, RefreshCw, ArrowRightLeft, X } from "lucide-react"
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

  const currentWarehouse = (warehouses || []).find((warehouse: any) => warehouse.id === warehouseId)
  const currentWarehouseType = (currentWarehouse as any)?.type as "insumo" | "fruta" | undefined
  const availableWarehouses = currentWarehouseType
    ? (warehouses || []).filter((warehouse: any) => warehouse.type === currentWarehouseType)
    : warehouses || []

  // Pre-fill warehouseId with the first available warehouse (helps UX)
  useEffect(() => {
    if ((!form.warehouseId || form.warehouseId === "") && availableWarehouses.length > 0) {
      setForm((f) => ({ ...f, warehouseId: availableWarehouses[0].id }))
    }
  }, [availableWarehouses])

  const filteredMovements = (movements || []).filter((movement) => {
    const mv: any = movement
    const matchesSearch =
      (mv.items?.[0]?.product?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (movement.warehouse?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || movement.type === typeFilter
    const matchesWarehouse = !warehouseId || movement.warehouseId === warehouseId
    return matchesSearch && matchesType && matchesWarehouse
  })

  // Pagination state (client-side)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Reset to first page when filters or movement list change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, typeFilter, warehouseId, movements])

  const totalItems = filteredMovements.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedMovements = filteredMovements.slice(startIndex, endIndex)

  // Keep current page within range when pageSize/totalPages change
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [pageSize, totalPages])

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

  // New movement form state (supports multiple items)
  const [form, setForm] = useState({
    type: "entrada",
    warehouseId: warehouseId || "",
    notes: "",
  })

  // Movement items: each row contains a product + quantity + unitCost + lotNumber
  const [movementItems, setMovementItems] = useState<Array<{ id: string; productId: string; quantityInput: string; unitCostInput: string; lotNumber: string }>>([
    { id: "i-0", productId: "", quantityInput: "", unitCostInput: "", lotNumber: "" },
  ])

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
    if (availableWarehouses.length > 0) {
      setTransferFrom((v) =>
        v ? v : warehouseId && availableWarehouses.some((warehouse) => warehouse.id === warehouseId) ? warehouseId : availableWarehouses[0].id
      )
      setTransferTo((v) => {
        if (v) return v
        const sourceId = warehouseId && availableWarehouses.some((warehouse) => warehouse.id === warehouseId) ? warehouseId : availableWarehouses[0].id
        const nextWarehouse = availableWarehouses.find((warehouse) => warehouse.id !== sourceId)
        return nextWarehouse ? nextWarehouse.id : sourceId
      })
    }
  }, [availableWarehouses, warehouseId])

  const selectedWarehouse = (warehouses || []).find((warehouse: any) => warehouse.id === form.warehouseId)
  const selectedWarehouseType = (selectedWarehouse as any)?.type as "insumo" | "fruta" | undefined
  const availableProductsForMovement = selectedWarehouseType
    ? products.filter((product: any) => product.type === selectedWarehouseType)
    : products

  const transferSourceWarehouse = (warehouses || []).find((warehouse: any) => warehouse.id === transferFrom)
  const transferSourceType = (transferSourceWarehouse as any)?.type as "insumo" | "fruta" | undefined
  const availableProductsForTransfer = transferSourceType
    ? products.filter((product: any) => product.type === transferSourceType)
    : products

  useEffect(() => {
    // if warehouse type changes, drop any selected products that are no longer available
    setMovementItems((items) =>
      items.map((it) => {
        if (!it.productId) return it
        if (!availableProductsForMovement.some((product: any) => product.id === it.productId)) {
          return { ...it, productId: "" }
        }
        return it
      })
    )
  }, [form.warehouseId, selectedWarehouseType])

  useEffect(() => {
    if (!transferProduct) return
    if (!availableProductsForTransfer.some((product: any) => product.id === transferProduct)) {
      setTransferProduct("")
    }
  }, [transferFrom, transferSourceType, transferProduct])

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Basic client-side validation to prevent empty/invalid payloads
      if (!form.warehouseId) {
        console.error("Warehouse is required")
        return
      }
      // validate movementItems: at least one valid item
      const validItems = movementItems.filter((it) => it.productId && it.quantityInput && Number(it.quantityInput) > 0)
      if (validItems.length === 0) {
        toast.error("Debe agregar al menos un producto con cantidad válida")
        return
      }

      // type/product compatibility checks
      for (const it of validItems) {
        const selectedProduct: any = products.find((product) => product.id === it.productId)
        if (selectedWarehouseType && selectedProduct?.type && selectedProduct.type !== selectedWarehouseType) {
          toast.error(`El producto ${selectedProduct?.name || it.productId} es tipo ${selectedProduct.type} y el almacén acepta ${selectedWarehouseType}`)
          return
        }
        if (!/^[0-9a-fA-F-]{36}$/.test(it.productId)) {
          console.error("Product ID must be a valid UUID", it.productId)
          return
        }
      }

      const loading = toast.loading("Registrando movimiento...")
      try {
        await createMovement({
          type: form.type as any,
          warehouseId: form.warehouseId,
          notes: form.notes,
          items: validItems.map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantityInput),
            unitId: "",
            fromLocationId: undefined,
            toLocationId: undefined,
            lotNumber: it.lotNumber || undefined,
            unitCost: it.unitCostInput ? Number(it.unitCostInput) : undefined,
          })),
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
          const inv = await api.get(`/api/inventory?warehouseId=${form.warehouseId}`)
          console.debug("[debug] inventory response:", inv)
          const mov = await api.get(`/api/inventory/movements?warehouseId=${form.warehouseId}`)
          console.debug("[debug] movements response:", mov)
        } else {
          const movAll = await api.get(`/api/inventory/movements?`)
          console.debug("[debug] movements response:", movAll)
        }
      } catch (err) {
        console.error("[debug] error fetching debug endpoints", err)
      }

      toast.success("Movimiento registrado")

  // reset minimal fields and items
  setForm((f) => ({ ...f, notes: "" }))
  setMovementItems([{ id: `i-${Date.now()}`, productId: "", quantityInput: "", unitCostInput: "", lotNumber: "" }])
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
                  placeholder="Buscar por producto o almacén..."
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
                    <TableHead className="text-right">Precio Unitario</TableHead>
                    <TableHead>Almacén</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="text-right">Costo Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMovements.map((movement, index) => (
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
                      <TableCell className="font-medium">{(movement as any).items?.[0]?.product?.name}</TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          const item = (movement as any).items?.[0]
                          const unitPrice = item?.cost || item?.product?.price
                          return unitPrice ? formatCurrency(unitPrice) : "-"
                        })()}
                      </TableCell>
                      <TableCell>{movement.warehouse?.name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {movement.type === "salida" ? "-" : "+"}
                        {(movement as any).items?.[0]?.quantity}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium">
                          {movement.userName || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          const item = (movement as any).items?.[0]
                          const unitPrice = item?.cost || item?.product?.price
                          const quantity = Number(item?.quantity) || 0
                          const total = unitPrice ? unitPrice * quantity : 0
                          return total > 0 ? formatCurrency(total) : "-"
                        })()}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination controls */}
              <div className="flex items-center justify-between px-4 py-2">
                <div className="text-sm text-muted-foreground">
                  {totalItems === 0
                    ? "Mostrando 0 de 0"
                    : `Mostrando ${startIndex + 1}–${Math.min(endIndex, totalItems)} de ${totalItems}`}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    Anterior
                  </Button>
                  <div className="text-sm">Página {currentPage} / {totalPages}</div>
                  <Button variant="outline" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    Siguiente
                  </Button>

                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                      {availableWarehouses.map((warehouse: any, index: number) => (
                        <SelectItem key={`new-wh-${warehouse.id || index}`} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dynamic list of product items */}
                {movementItems.map((it, idx) => (
                  <div key={it.id} className="md:col-span-2 space-y-2 border rounded p-3">
                    <div className="flex items-start justify-between">
                      <Label>Producto {idx + 1}</Label>
                      <div className="flex items-center gap-2">
                        {movementItems.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => setMovementItems((prev) => prev.filter((p) => p.id !== it.id))}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <ComboBox
                      value={it.productId}
                      onChange={(v) => setMovementItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, productId: v } : p)))}
                      options={availableProductsForMovement.map((product) => ({
                        value: String(product.id),
                        label: `${product.name}`,
                        subtitle: product.sku || product.type,
                      }))}
                      placeholder="Seleccionar producto"
                      searchPlaceholder="Buscar producto..."
                      emptyMessage="No hay productos para este tipo de almacén"
                    />

                    <div className="grid gap-4 md:grid-cols-3 mt-2">
                      <div className="space-y-2">
                        <Label>Cantidad</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={it.quantityInput}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setMovementItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, quantityInput: value } : p)))
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Número de Lote</Label>
                        <Input
                          placeholder="LOT-2024-001"
                          value={it.lotNumber}
                          onChange={(e) => setMovementItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, lotNumber: e.target.value } : p)))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Costo Unitario</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={it.unitCostInput}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setMovementItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, unitCostInput: value } : p)))
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="md:col-span-2">
                  <Button variant="outline" type="button" onClick={() => setMovementItems((prev) => [...prev, { id: `i-${Date.now()}`, productId: "", quantityInput: "", unitCostInput: "", lotNumber: "" }])}>
                    Agregar otro producto
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Información adicional sobre el movimiento..." />
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <Button variant="ghost" type="button" onClick={() => {
                    setForm({ type: "entrada", warehouseId: warehouseId || "", notes: "" })
                    setMovementItems([{ id: `i-${Date.now()}`, productId: "", quantityInput: "", unitCostInput: "", lotNumber: "" }])
                  }}>Cancelar</Button>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="submit">
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar Movimiento
                  </Button>
                </div>
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

                const sourceType = (transferSourceWarehouse as any)?.type
                const destinationType = (warehouses || []).find((warehouse: any) => warehouse.id === transferTo)?.type
                const transferSelectedProduct = products.find((product) => product.id === transferProduct)

                if (sourceType && destinationType && sourceType !== destinationType) {
                  toast.error("Origen y destino deben ser del mismo tipo")
                  return
                }

                if (sourceType && transferSelectedProduct?.type && transferSelectedProduct.type !== sourceType) {
                  toast.error(`El producto es tipo ${transferSelectedProduct.type} y el almacén origen acepta ${sourceType}`)
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
                      {availableWarehouses.map((warehouse: any, index: number) => (
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
                      {availableWarehouses.map((warehouse: any, index: number) => (
                        <SelectItem key={`to-${warehouse.id || index}`} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="transfer-product">Producto</Label>
                  <ComboBox
                    value={transferProduct}
                    onChange={(v) => setTransferProduct(v)}
                    options={availableProductsForTransfer.map((product) => ({
                      value: String(product.id),
                      label: `${product.name}`,
                      subtitle: product.sku || product.type,
                    }))}
                    placeholder="Seleccionar producto"
                    searchPlaceholder="Buscar producto..."
                    emptyMessage="No hay productos para este tipo de almacén"
                  />
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
                      {availableWarehouses.map((warehouse: any, index: number) => (
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
