"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockProducts } from "@/lib/mock-data"
import { useInventoryByWarehouse, useMovements, updateInventoryStock } from "@/lib/hooks/use-inventory"
import { useMemo } from "react"
import { useProducts, updateProduct } from "@/lib/hooks/use-products"
import { formatNumber } from "@/lib/utils/format"
import { Search, AlertTriangle, Download, Upload, ArrowLeftRight } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import * as XLSX from 'xlsx'
import { useToast } from "@/hooks/use-toast"

interface StockTabProps {
  warehouseId?: string
}

export function StockTab({ warehouseId }: StockTabProps) {
  const { inventory: rawInventory } = useInventoryByWarehouse(warehouseId || null)
  const { products } = useProducts()
  const { movements } = useMovements({ warehouseId })

  const inventory = Array.isArray(rawInventory) ? rawInventory : [];
  // Calcular el valor total de productos con stock bajo
  const lowStockValue = inventory.reduce((sum, stock) => {
    const product = products.find((p) => p.id === stock.productId)
    if (!product) return sum
    const min = product.minStock || stock.minStock || 0
    if (stock.currentStock < min) {
      return sum + (stock.currentStock * (product.costPrice || 0))
    }
    return sum
  }, 0)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingStock, setEditingStock] = useState<any | null>(null)
  const [editAvailable, setEditAvailable] = useState<string>("")
  const [editLocation, setEditLocation] = useState<string>("")
  const [editLotNumber, setEditLotNumber] = useState<string>("")
  const [editExpirationDate, setEditExpirationDate] = useState<string>("")
  const [editMin, setEditMin] = useState<string>("")
  const [editMax, setEditMax] = useState<string>("")
  const [editReorder, setEditReorder] = useState<string>("")
  const [editCostPrice, setEditCostPrice] = useState<string>("")
  const [editSalePrice, setEditSalePrice] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Build a map of latest lot numbers by product from recent movements
  const latestLotByProduct = useMemo(() => {
    const map: Record<string, string | undefined> = {}
    ;(movements || []).forEach((m: any) => {
      const createdAt = new Date(m.createdAt || m.created_at || Date.now())
      ;(m.items || []).forEach((it: any) => {
        if (!map[it.productId]) {
          // prefer movement.lotNumber normalized earlier
          map[it.productId] = m.lotNumber || it.lotNumber || (it.notes && String(it.notes).match(/Lote:\s*(.+)/i)?.[1])
        }
      })
    })
    return map
  }, [movements])

  const filteredStock = inventory.filter((stock) => {
    const product = products.find((p) => p.id === stock.productId)
    const matchesSearch =
      (product?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product?.sku || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesWarehouse = !warehouseId || stock.warehouseId === warehouseId

    let matchesStatus = true
    const min = product ? product.minStock || stock.minStock || 0 : stock.minStock || 0
    const max = product ? product.maxStock || stock.maxStock || 0 : stock.maxStock || 0
    if (filterStatus === "low" && product) {
      matchesStatus = stock.currentStock < min
    } else if (filterStatus === "normal" && product) {
      matchesStatus = stock.currentStock >= min && stock.currentStock <= max
    } else if (filterStatus === "high" && product) {
      matchesStatus = stock.currentStock > max
    }

    return matchesSearch && matchesWarehouse && matchesStatus
  })

  const getStockStatus = (stock: any) => {
    const product = products.find((p) => p.id === stock.productId)
    if (!product) return "normal"
    const min = product.minStock || stock.minStock || 0
    const max = product.maxStock || stock.maxStock || 0
    if (stock.currentStock < min) return "low"
    if (stock.currentStock > max) return "high"
    return "normal"
  }

  function isUUID(str: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
  }

  // Función para exportar a Excel
  const handleExport = () => {
    try {
      // Preparar los datos para exportar
      const exportData = filteredStock.map((stock) => {
        const product = products.find((p) => p.id === stock.productId)
        const status = getStockStatus(stock)
        
        return {
          SKU: product?.sku || '',
          Producto: product?.name || '',
          'Unidad de Medida': product?.unitOfMeasure || stock.unitOfMeasure || '',
          Ubicación: stock.location || 'Sin asignar',
          Lote: stock.lotNumber || latestLotByProduct[stock.productId] || '',
          Vencimiento: stock.expirationDate ? new Date(stock.expirationDate).toLocaleDateString('es-MX') : '',
          Disponible: Number(stock.currentStock || 0),
          Reservado: Number(stock.reservedQuantity || 0),
          'Stock Mínimo': Number(product?.minStock || stock.minStock || 0),
          'Stock Máximo': Number(product?.maxStock || stock.maxStock || 0),
          'Punto de Reorden': Number(product?.reorderPoint || stock.reorderPoint || 0),
          Estado: status === 'low' ? 'Bajo' : status === 'high' ? 'Alto' : 'Normal',
          'ID Producto': stock.productId,
          'ID Almacén': stock.warehouseId,
        }
      })

      // Crear el libro de trabajo
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario')

      // Configurar anchos de columna
      ws['!cols'] = [
        { wch: 15 }, // SKU
        { wch: 30 }, // Producto
        { wch: 15 }, // Unidad
        { wch: 15 }, // Ubicación
        { wch: 15 }, // Lote
        { wch: 15 }, // Vencimiento
        { wch: 12 }, // Disponible
        { wch: 12 }, // Reservado
        { wch: 12 }, // Min
        { wch: 12 }, // Max
        { wch: 15 }, // Reorden
        { wch: 10 }, // Estado
        { wch: 36 }, // ID Producto
        { wch: 36 }, // ID Almacén
      ]

      // Generar el archivo
      const fileName = `inventario_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast({
        title: "Exportación exitosa",
        description: `Se exportaron ${exportData.length} registros a ${fileName}`,
      })
    } catch (error) {
      console.error('Error exporting:', error)
      toast({
        title: "Error al exportar",
        description: "Hubo un problema al exportar el inventario",
        variant: "destructive",
      })
    }
  }

  // Función para importar desde Excel
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        for (const row of jsonData) {
          try {
            // Validar que tenga los campos requeridos
            if (!row['ID Producto'] || !row['ID Almacén']) {
              errors.push(`Fila sin ID Producto o ID Almacén`)
              errorCount++
              continue
            }

            // Validar UUIDs
            if (!isUUID(row['ID Producto']) || !isUUID(row['ID Almacén'])) {
              errors.push(`IDs inválidos para producto ${row['SKU'] || row['Producto']}`)
              errorCount++
              continue
            }

            // Preparar datos para actualizar
            const updateData: any = {
              productId: row['ID Producto'],
              warehouseId: row['ID Almacén'],
            }

            // Solo incluir campos que estén presentes y sean válidos
            if (row['Disponible'] !== undefined && row['Disponible'] !== null && row['Disponible'] !== '') {
              updateData.quantity = Number(row['Disponible'])
            }
            if (row['Ubicación'] && row['Ubicación'] !== 'Sin asignar') {
              updateData.locationId = row['Ubicación']
            }
            if (row['Lote']) {
              updateData.lotNumber = row['Lote']
            }
            if (row['Vencimiento']) {
              // Intentar parsear la fecha en diferentes formatos
              const dateStr = String(row['Vencimiento'])
              let dateObj: Date | null = null
              
              // Intentar formato dd/mm/yyyy
              if (dateStr.includes('/')) {
                const [day, month, year] = dateStr.split('/')
                dateObj = new Date(Number(year), Number(month) - 1, Number(day))
              } else {
                dateObj = new Date(dateStr)
              }
              
              if (dateObj && !isNaN(dateObj.getTime())) {
                updateData.expirationDate = dateObj.toISOString().split('T')[0]
              }
            }
            if (row['Stock Mínimo'] !== undefined && row['Stock Mínimo'] !== null && row['Stock Mínimo'] !== '') {
              updateData.minStock = Number(row['Stock Mínimo'])
            }
            if (row['Stock Máximo'] !== undefined && row['Stock Máximo'] !== null && row['Stock Máximo'] !== '') {
              updateData.maxStock = Number(row['Stock Máximo'])
            }
            if (row['Punto de Reorden'] !== undefined && row['Punto de Reorden'] !== null && row['Punto de Reorden'] !== '') {
              updateData.reorderPoint = Number(row['Punto de Reorden'])
            }

            await updateInventoryStock(updateData)
            successCount++
          } catch (error) {
            console.error('Error updating row:', row, error)
            errors.push(`Error en ${row['SKU'] || row['Producto']}: ${error}`)
            errorCount++
          }
        }

        // Mostrar resultado
        if (errorCount === 0) {
          toast({
            title: "Importación exitosa",
            description: `Se importaron ${successCount} registros correctamente`,
          })
          window.location.reload()
        } else {
          toast({
            title: "Importación completada con errores",
            description: `${successCount} exitosos, ${errorCount} errores. Revisa la consola para más detalles.`,
            variant: "destructive",
          })
          console.error('Import errors:', errors)
        }
      } catch (error) {
        console.error('Error importing:', error)
        toast({
          title: "Error al importar",
          description: "Hubo un problema al leer el archivo",
          variant: "destructive",
        })
      }
    }
    reader.readAsArrayBuffer(file)
    
    // Limpiar el input para permitir reimportar el mismo archivo
    if (event.target) {
      event.target.value = ''
    }
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Valor de productos con stock bajo</CardTitle>
          <CardDescription>
            {lowStockValue > 0
              ? `Total: $${lowStockValue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
              : "No hay productos con stock bajo"}
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {/* <Button>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Nuevo Movimiento
          </Button> */}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por producto o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="low">Stock Bajo</SelectItem>
                <SelectItem value="normal">Stock Normal</SelectItem>
                <SelectItem value="high">Stock Alto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock Actual por Ubicación</CardTitle>
          <CardDescription>
            {filteredStock.length} registro{filteredStock.length !== 1 ? "s" : ""} encontrado
            {filteredStock.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead>Reservado</TableHead>
                <TableHead>Precio Costo</TableHead>
                <TableHead>Precio Venta</TableHead>
                <TableHead>Stock Min/Max</TableHead>
                <TableHead>Punto Reorden</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStock.map((stock) => {
                const product = products.find((p) => p.id === stock.productId)
                const status = getStockStatus(stock)

                return (
                  <TableRow key={stock.id}>
                    <TableCell className="font-mono text-sm">{product?.sku}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product?.name}</p>
                        <p className="text-xs text-muted-foreground">{product?.unitOfMeasure || stock.unitOfMeasure || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{stock.location || "Sin asignar"}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{stock.lotNumber || latestLotByProduct[stock.productId] || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {stock.expirationDate ? stock.expirationDate.toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="font-medium">{formatNumber(stock.currentStock)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatNumber(stock.reservedQuantity || 0)}</TableCell>
                    <TableCell className="text-sm">
                      ${formatNumber((product as any)?.cost || (product as any)?.costPrice || 0)}
                    </TableCell>
                    <TableCell className="text-sm">
                      ${formatNumber((product as any)?.price || (product as any)?.salePrice || 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground">{formatNumber(product?.minStock || stock.minStock || 0)}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{formatNumber(product?.maxStock || stock.maxStock || 0)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatNumber(product?.reorderPoint || stock.reorderPoint || 0)}</Badge>
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <div>
                        {status === "low" && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Bajo
                          </Badge>
                        )}
                        {status === "normal" && <Badge variant="default">Normal</Badge>}
                        {status === "high" && <Badge variant="secondary">Alto</Badge>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingStock(stock)
                          const product = products.find((p) => p.id === stock.productId)
                          setEditAvailable(String(stock.currentStock || 0))
                          setEditLocation(stock.location || "")
                          setEditLotNumber(stock.lotNumber || latestLotByProduct[stock.productId] || "")
                          setEditExpirationDate(stock.expirationDate ? new Date(stock.expirationDate).toISOString().split('T')[0] : "")
                          setEditCostPrice(String((product as any)?.cost || (product as any)?.costPrice || ""))
                          setEditSalePrice(String((product as any)?.price || (product as any)?.salePrice || ""))
                          setEditMin(String(product?.minStock || stock.minStock || 0))
                          setEditMax(String(product?.maxStock || stock.maxStock || 0))
                          setEditReorder(String(product?.reorderPoint || stock.reorderPoint || 0))
                          setEditDialogOpen(true)
                        }}
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Stock Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open)
        if (!open) setEditingStock(null)
      }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Inventario</DialogTitle>
            <DialogDescription>
              Ajusta los valores de cantidad disponible, ubicación, lote, vencimiento y parámetros de stock.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-1 gap-1">
              <label className="text-sm font-medium">Cantidad Disponible</label>
              <Input 
                type="number"
                step="0.01"
                value={editAvailable} 
                onChange={(e) => setEditAvailable(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-1 gap-1">
              <label className="text-sm font-medium">Ubicación</label>
              <Input 
                value={editLocation} 
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="Ej: A1-B2"
              />
            </div>
            <div className="grid grid-cols-1 gap-1">
              <label className="text-sm font-medium">Lote</label>
              <Input 
                value={editLotNumber} 
                onChange={(e) => setEditLotNumber(e.target.value)}
                placeholder="Número de lote"
              />
            </div>
            <div className="grid grid-cols-1 gap-1">
              <label className="text-sm font-medium">Fecha de Vencimiento</label>
              <Input 
                type="date"
                value={editExpirationDate} 
                onChange={(e) => setEditExpirationDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-1">
              <label className="text-sm font-medium">Precio de Costo</label>
              <Input 
                type="number"
                step="0.01"
                value={editCostPrice} 
                onChange={(e) => setEditCostPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-1 gap-1">
              <label className="text-sm font-medium">Precio de Venta</label>
              <Input 
                type="number"
                step="0.01"
                value={editSalePrice} 
                onChange={(e) => setEditSalePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-1 gap-1">
              <label className="text-sm font-medium">Stock Mínimo</label>
              <Input 
                type="number"
                value={editMin} 
                onChange={(e) => setEditMin(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-1 gap-1">
              <label className="text-sm font-medium">Stock Máximo</label>
              <Input 
                type="number"
                value={editMax} 
                onChange={(e) => setEditMax(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-1 gap-1">
              <label className="text-sm font-medium">Punto de Reorden</label>
              <Input 
                type="number"
                value={editReorder} 
                onChange={(e) => setEditReorder(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!editingStock) return
                if (!isUUID(editingStock.productId)) {
                  alert("Error: El ID del producto no es un UUID válido.")
                  return
                }
                if (!isUUID(warehouseId as string)) {
                  alert("Error: El ID del almacén no es un UUID válido.")
                  return
                }

                try {
                  // Actualizar el inventario
                  await updateInventoryStock({
                    productId: editingStock.productId,
                    warehouseId: warehouseId as string,
                    quantity: Number(editAvailable || 0),
                    locationId: editLocation || undefined,
                    lotNumber: editLotNumber || undefined,
                    expirationDate: editExpirationDate || undefined,
                    minStock: Number(editMin || 0),
                    maxStock: Number(editMax || 0),
                    reorderPoint: Number(editReorder || 0),
                  })

                  // Actualizar los precios del producto si se modificaron
                  if (editCostPrice || editSalePrice) {
                    await updateProduct(editingStock.productId, {
                      costPrice: editCostPrice ? Number(editCostPrice) : undefined,
                      salePrice: editSalePrice ? Number(editSalePrice) : undefined,
                    })
                  }

                  // keep existing behaviour for now
                  window.location.reload()
                } catch (err) {
                  console.error("Error updating inventory settings", err)
                  alert("Error actualizando inventario")
                }
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
