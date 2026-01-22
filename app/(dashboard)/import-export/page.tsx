"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  TableIcon,
} from "lucide-react"
import { motion } from "framer-motion"
import * as XLSX from "xlsx"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"

export default function ImportExportPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importType, setImportType] = useState<string>("products")
  const [mappingStep, setMappingStep] = useState<number>(1)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<string>("export")

  // Leer parámetro type de la URL para pre-seleccionar tipo de importación
  useEffect(() => {
    const typeParam = searchParams.get('type')
    if (typeParam && ['products', 'inventory', 'suppliers', 'input-assignments', 'fruit-receptions', 'initial-stock'].includes(typeParam)) {
      setImportType(typeParam)
      setActiveTab("import")
    }
  }, [searchParams])

  // Export states
  const [exportFormat, setExportFormat] = useState<string>("xlsx")
  const [includeInactive, setIncludeInactive] = useState(true)
  const [includeImages, setIncludeImages] = useState(false)
  const [includeZeroStock, setIncludeZeroStock] = useState(false)
  const [includeLots, setIncludeLots] = useState(true)
  const [warehouseFilter, setWarehouseFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [movementType, setMovementType] = useState("all")

  // Parsed columns / preview rows
  const [sampleColumns, setSampleColumns] = useState<string[]>([])
  const [sampleRows, setSampleRows] = useState<string[][]>([])
  // Sheets handling for multi-sheet workbooks
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null)
  const workbookRef = useRef<any>(null)
  const [importResult, setImportResult] = useState<any | null>(null)
  // Dynamic fields for fruit-receptions
  const [dynamicFields, setDynamicFields] = useState<Array<{ field: string; label: string; required: boolean }>>([])

  const getAuthToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  const parseSheet = (sheetName: string | null) => {
    if (!sheetName || !workbookRef.current) return
    try {
      const ws = workbookRef.current.Sheets[sheetName]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[]
      if (rows && rows.length > 0) {
        const headers = rows[0].map((h: any) => (h ?? "").toString().trim())
        const previews = rows.slice(1, 6).map((r) => r.map((c: any) => (c ?? "").toString()))
        setSampleColumns(headers)
        setSampleRows(previews)

        // Auto-map (only for fields not already mapped)
        const newMapping = { ...columnMapping }
        requiredFields[importType]?.forEach((f) => {
          if (newMapping[f.field]) return
          const match = headers.find(
            (h: string) => h && (h.toLowerCase() === f.field.toLowerCase() || h.toLowerCase() === f.label.toLowerCase())
          )
          if (match) newMapping[f.field] = match
        })
        setColumnMapping(newMapping)
      }
    } catch (err) {
      console.error("Error parsing selected sheet:", err)
    }
  }

  // Required fields for each import type
  const requiredFields: Record<string, Array<{ field: string; label: string; required: boolean }>> = {
    products: [
      { field: "sku", label: "SKU", required: true },
      { field: "name", label: "Nombre", required: true },
      { field: "description", label: "Descripción", required: false },
      { field: "category", label: "Categoría", required: false },
      // Prices are managed in almacén; do not include cost or sale price in product import mapping
      { field: "minStock", label: "Stock Mínimo", required: false },
      { field: "maxStock", label: "Stock Máximo", required: false },
      { field: "unitOfMeasure", label: "Unidad de Medida", required: false },
    ],
    inventory: [
      { field: "sku", label: "SKU del Producto", required: true },
      { field: "warehouse", label: "Almacén", required: true },
      { field: "quantity", label: "Cantidad", required: true },
      { field: "location", label: "Ubicación", required: false },
      { field: "lotNumber", label: "Número de Lote", required: false },
      { field: "expirationDate", label: "Fecha de Vencimiento", required: false },
      { field: "costPrice", label: "Precio de Costo", required: false },
    ],
    suppliers: [
      { field: "code", label: "Código", required: true },
      { field: "businessName", label: "Razón Social", required: true },
      { field: "rfc", label: "RFC", required: true },
      { field: "email", label: "Email", required: true },
      { field: "phone", label: "Teléfono", required: true },
      { field: "address", label: "Dirección", required: true },
      { field: "creditDays", label: "Días de Crédito", required: true },
    ],
    warehouses: [
      { field: "code", label: "Código", required: true },
      { field: "name", label: "Nombre", required: true },
      { field: "address", label: "Dirección", required: false },
      { field: "phone", label: "Teléfono", required: false },
      { field: "email", label: "Email", required: false },
    ],
    "input-assignments": [
      { field: "producer", label: "Productor", required: true },
      { field: "warehouse", label: "Almacén", required: true },
      { field: "date", label: "Fecha", required: false },
      { field: "sku", label: "SKU del Producto", required: true },
      { field: "quantity", label: "Cantidad", required: true },
      { field: "notes", label: "Notas", required: false },
    ],
    "fruit-receptions": [
      { field: "producer", label: "Productor", required: true },
      { field: "warehouse", label: "Almacén", required: true },
      { field: "product", label: "Producto (SKU)", required: true },
      { field: "date", label: "Fecha", required: false },
      { field: "boxes", label: "Cajas", required: true },
      { field: "weightPerBox", label: "Peso por Caja", required: false },
      { field: "totalWeight", label: "Peso Total", required: false },
      // Material devuelto - Cajas
      { field: "codigoCaja", label: "Código de Caja 1", required: false },
      { field: "cantidadCaja", label: "Cantidad de Caja 1", required: false },
      // Material devuelto - Clams
      { field: "codigoClam", label: "Código de Clam 1", required: false },
      { field: "cantidadClam", label: "Cantidad de Clam 1", required: false },
      // Material devuelto - Tarimas
      { field: "codigoTarima", label: "Código de Tarima 1", required: false },
      { field: "cantidadTarima", label: "Cantidad de Tarima 1", required: false },
      // Material devuelto - Interlocks
      { field: "codigoInterlock", label: "Código de Interlock 1", required: false },
      { field: "cantidadInterlock", label: "Cantidad de Interlock 1", required: false },
      // Material devuelto - Otros productos
      { field: "codigoProducto", label: "Código de Producto 1", required: false },
      { field: "cantidadProducto", label: "Cantidad de Producto 1", required: false },
      { field: "notes", label: "Notas", required: false },
    ],
    "initial-stock": [
      { field: "sku", label: "SKU del Producto", required: true },
      { field: "warehouse", label: "Almacén", required: true },
      { field: "warehouseId", label: "ID Almacén", required: false },
      { field: "quantity", label: "Cantidad", required: true },
      { field: "location", label: "Ubicación", required: false },
      { field: "lotNumber", label: "Número de Lote", required: false },
      { field: "expirationDate", label: "Fecha de Vencimiento", required: false },
      { field: "costPrice", label: "Precio de Costo", required: false },
      { field: "minStock", label: "Stock Mínimo", required: false },
      { field: "maxStock", label: "Stock Máximo", required: false },
      { field: "reorderPoint", label: "Punto de Reorden", required: false },
    ],
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) return

        // Read as array for xlsx which supports csv/xlsx
        const arrayBuffer = data as ArrayBuffer
        const workbook = XLSX.read(arrayBuffer, { type: "array" })

        // keep workbook to allow switching sheets
        workbookRef.current = workbook
        const names = workbook.SheetNames || []
        setSheetNames(names)
        const initialSheet = names[0] ?? null
        setSelectedSheet(initialSheet)

        if (initialSheet) {
          const ws = workbook.Sheets[initialSheet]
          // sheet_to_json with header:1 returns array of rows
          const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[]
          if (rows && rows.length > 0) {
            const headers = rows[0].map((h: any) => (h ?? "").toString().trim())
            const previews = rows.slice(1, 6).map((r) => r.map((c: any) => (c ?? "").toString()))
            setSampleColumns(headers)
            setSampleRows(previews)

            // Para fruit-receptions, detectar dinámicamente columnas de materiales devueltos
            let dynamicFields = [...requiredFields[importType]]
            if (importType === 'fruit-receptions') {
              // Remover los campos estáticos de materiales devueltos
              dynamicFields = dynamicFields.filter(f => 
                !f.field.startsWith('codigo') &&
                !f.field.startsWith('cantidad') &&
                !f.field.startsWith('precio') &&
                f.field !== 'valorTotalMaterialDevuelto'
              )

              // Detectar columnas de materiales devueltos en el orden del Excel
              const materialPatterns = [
                { type: 'Caja', codePattern: /código de caja\s*(\d*)/i, qtyPattern: /cantidad de caja\s*(\d*)/i },
                { type: 'Clam', codePattern: /código de clam\s*(\d*)/i, qtyPattern: /cantidad de clam\s*(\d*)/i },
                { type: 'Tarima', codePattern: /código de tarima\s*(\d*)/i, qtyPattern: /cantidad de tarima\s*(\d*)/i },
                { type: 'Interlock', codePattern: /código de interlock\s*(\d*)/i, qtyPattern: /cantidad de interlock\s*(\d*)/i },
                { type: 'Producto', codePattern: /código de producto\s*(\d*)/i, qtyPattern: /cantidad de producto\s*(\d*)/i },
              ]

              const detectedFields: Array<{ field: string; label: string; required: boolean; order: number }> = []

              headers.forEach((header: string, index: number) => {
                materialPatterns.forEach(pattern => {
                  const codeMatch = header.match(pattern.codePattern)
                  const qtyMatch = header.match(pattern.qtyPattern)

                  if (codeMatch) {
                    const num = codeMatch[1] ? parseInt(codeMatch[1]) : 1
                    const fieldKey = `codigo${pattern.type}${num > 1 ? num : ''}`
                    detectedFields.push({ field: fieldKey, label: header, required: false, order: index })
                  } else if (qtyMatch) {
                    const num = qtyMatch[1] ? parseInt(qtyMatch[1]) : 1
                    const fieldKey = `cantidad${pattern.type}${num > 1 ? num : ''}`
                    detectedFields.push({ field: fieldKey, label: header, required: false, order: index })
                  }
                })
              })

              // Ordenar por el índice de las columnas del Excel
              detectedFields.sort((a, b) => a.order - b.order)

              // Insertar los campos detectados antes de "Notas"
              const notesIndex = dynamicFields.findIndex(f => f.field === 'notes')
              if (notesIndex !== -1) {
                dynamicFields.splice(notesIndex, 0, ...detectedFields.map(({ field, label, required }) => ({ field, label, required })))
              } else {
                dynamicFields.push(...detectedFields.map(({ field, label, required }) => ({ field, label, required })))
              }
            }

            // Guardar campos dinámicos en el estado
            setDynamicFields(dynamicFields)

            // Auto-map by exact match on field or label (case-insensitive)
            const newMapping: Record<string, string> = {}
            dynamicFields.forEach((f) => {
              const match = headers.find(
                (h: string) => h && (h.toLowerCase() === f.field.toLowerCase() || h.toLowerCase() === f.label.toLowerCase())
              )
              if (match) newMapping[f.field] = match
            })
            setColumnMapping(newMapping)
          }
        }

        setImportFile(file)
        setMappingStep(2)
      } catch (err) {
        console.error("Error parsing file:", err)
        alert("No se pudo leer el archivo. Asegúrate de que sea un Excel o CSV válido.")
      }
    }

    // Read as array buffer for xlsx
    reader.readAsArrayBuffer(file)
  }

  const handleExport = async (type: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const token = await getAuthToken()
      
      if (!token) {
        toast({
          title: "Error de autenticación",
          description: "No se encontró un token de autenticación. Por favor, inicia sesión nuevamente.",
          variant: "destructive",
        })
        return
      }

      let url = `${apiUrl}/api/imports/export/${type}?format=${exportFormat}`
      
      if (type === 'products') {
        url += `&includeInactive=${includeInactive}&includeImages=${includeImages}`
      } else if (type === 'inventory') {
        url += `&warehouseId=${warehouseFilter}&includeZeroStock=${includeZeroStock}&includeLots=${includeLots}`
      } else if (type === 'movements') {
        if (startDate) url += `&startDate=${startDate}`
        if (endDate) url += `&endDate=${endDate}`
        if (movementType !== 'all') url += `&type=${movementType}`
      } else if (type === 'suppliers') {
        url += `&includeInactive=${includeInactive}`
      } else if (type === 'fruit-receptions') {
        if (startDate) url += `&startDate=${startDate}`
        if (endDate) url += `&endDate=${endDate}`
        url += `&includeReturnedItems=${includeZeroStock}`
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Export error response:', response.status, errorText)
        throw new Error(`Error al exportar los datos: ${response.status}`)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      const extension = exportFormat === 'csv' ? 'csv' : 'xlsx'
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.${extension}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      toast({
        title: "Exportación exitosa",
        description: `Los datos de ${type} se han exportado correctamente`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Error al exportar",
        description: "Ocurrió un error al intentar exportar los datos",
        variant: "destructive",
      })
    }
  }

  const handleDownloadTemplate = async (type: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const token = await getAuthToken()
      
      if (!token) {
        toast({
          title: "Error de autenticación",
          description: "No se encontró un token de autenticación. Por favor, inicia sesión nuevamente.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`${apiUrl}/api/imports/templates/${type}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Error al descargar la plantilla')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `plantilla_${type}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      toast({
        title: "Descarga exitosa",
        description: `La plantilla de ${type} se ha descargado correctamente`,
      })
    } catch (error) {
      console.error('Template download error:', error)
      toast({
        title: "Error al descargar",
        description: "Ocurrió un error al intentar descargar la plantilla",
        variant: "destructive",
      })
    }
  }

  const handleImport = async () => {
    // Validate required mappings
    const missingRequired = (requiredFields[importType] || [])
      .filter((f) => f.required)
      .filter((f) => !columnMapping[f.field] || columnMapping[f.field] === "__none__")

    if (missingRequired.length > 0) {
      toast({
        title: "Campos requeridos faltantes",
        description: `Faltan columnas requeridas: ${missingRequired.map((m) => m.label).join(", ")}`,
        variant: "destructive",
      })
      return
    }

    if (!importFile) {
      toast({
        title: "Error",
        description: 'No se ha seleccionado un archivo',
        variant: "destructive",
      })
      return
    }

    // Build form data and send to backend
    const fd = new FormData()
    fd.append('file', importFile)
    fd.append('mapping', JSON.stringify(columnMapping))
    fd.append('type', importType)
    if (selectedSheet) fd.append('sheetName', selectedSheet)

    setMappingStep(3)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const token = await getAuthToken()
    
    if (!token) {
      toast({
        title: "Error de autenticación",
        description: "No se encontró un token de autenticación. Por favor, inicia sesión nuevamente.",
        variant: "destructive",
      })
      setMappingStep(1)
      return
    }

    fetch(`${apiUrl}/api/imports`, {
      method: 'POST',
      body: fd,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || 'Error en la importación')
        }
        return res.json()
      })
      .then((json) => {
        // Show result in the UI (mappingStep 4)
        setImportResult(json)
        setMappingStep(4)
        toast({
          title: "Importación completada",
          description: `Se importaron ${json.success} de ${json.processed} registros correctamente`,
        })
      })
      .catch((err) => {
        console.error('Import error', err)
        toast({
          title: "Error en la importación",
          description: err.message || 'Ocurrió un error durante la importación',
          variant: "destructive",
        })
        setMappingStep(1)
      })
  }

  const resetImport = () => {
    setImportFile(null)
    setMappingStep(1)
    setColumnMapping({})
    setSampleColumns([])
    setSampleRows([])
    setSheetNames([])
    setSelectedSheet(null)
    workbookRef.current = null
    setImportResult(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar / Exportar</h1>
        <p className="text-muted-foreground">Gestiona tus datos con archivos Excel</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="export">Exportar Datos</TabsTrigger>
          <TabsTrigger value="import">Importar Datos</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  Exportar Productos
                </CardTitle>
                <CardDescription>Descarga el catálogo completo de productos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Incluir</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-inactive" 
                        checked={includeInactive}
                        onCheckedChange={(checked) => setIncludeInactive(checked as boolean)}
                      />
                      <label htmlFor="include-inactive" className="text-sm">
                        Productos inactivos
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-images"
                        checked={includeImages}
                        onCheckedChange={(checked) => setIncludeImages(checked as boolean)}
                      />
                      <label htmlFor="include-images" className="text-sm">
                        URLs de imágenes
                      </label>
                    </div>
                  </div>
                </div>
                <Button className="w-full" onClick={() => handleExport("products")}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Productos
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TableIcon className="h-5 w-5 text-blue-600" />
                  Exportar Inventario
                </CardTitle>
                <CardDescription>Descarga el stock actual de todos los almacenes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Almacén</Label>
                  <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los almacenes</SelectItem>
                      <SelectItem value="1">Almacén Principal</SelectItem>
                      <SelectItem value="2">Almacén Secundario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Incluir</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-zero"
                        checked={includeZeroStock}
                        onCheckedChange={(checked) => setIncludeZeroStock(checked as boolean)}
                      />
                      <label htmlFor="include-zero" className="text-sm">
                        Productos con stock 0
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-lots" 
                        checked={includeLots}
                        onCheckedChange={(checked) => setIncludeLots(checked as boolean)}
                      />
                      <label htmlFor="include-lots" className="text-sm">
                        Números de lote
                      </label>
                    </div>
                  </div>
                </div>
                <Button className="w-full" onClick={() => handleExport("inventory")}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Inventario
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Exportar Movimientos
                </CardTitle>
                <CardDescription>Descarga el historial de movimientos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fecha Inicio</Label>
                    <Input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Fin</Label>
                    <Input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Movimiento</Label>
                  <Select value={movementType} onValueChange={setMovementType}>
                    <SelectTrigger>
                      <SelectValue />
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
                <Button className="w-full" onClick={() => handleExport("movements")}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Movimientos
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-orange-600" />
                  Exportar Proveedores
                </CardTitle>
                <CardDescription>Descarga el directorio de proveedores</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Incluir</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-inactive-suppliers" 
                        checked={includeInactive}
                        onCheckedChange={(checked) => setIncludeInactive(checked as boolean)}
                      />
                      <label htmlFor="include-inactive-suppliers" className="text-sm">
                        Proveedores inactivos
                      </label>
                    </div>
                  </div>
                </div>
                <Button className="w-full" onClick={() => handleExport("suppliers")}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Proveedores
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-lime-600" />
                  Exportar Recepciones de Fruta
                </CardTitle>
                <CardDescription>Descarga el historial de recepciones de fruta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fecha Inicio</Label>
                    <Input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Fin</Label>
                    <Input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Incluir</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-returned-items"
                        checked={includeZeroStock}
                        onCheckedChange={(checked) => setIncludeZeroStock(checked as boolean)}
                      />
                      <label htmlFor="include-returned-items" className="text-sm">
                        Material devuelto
                      </label>
                    </div>
                  </div>
                </div>
                <Button className="w-full" onClick={() => handleExport("fruit-receptions")}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Recepciones
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Importar Datos desde Excel</CardTitle>
              <CardDescription>Carga información masiva con mapeo de columnas</CardDescription>
            </CardHeader>
            <CardContent>
              {mappingStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Datos</Label>
                    <Select value={importType} onValueChange={setImportType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="products">Productos</SelectItem>
                        <SelectItem value="inventory">Inventario</SelectItem>
                        <SelectItem value="suppliers">Proveedores</SelectItem>
                        <SelectItem value="input-assignments">Asignación de Insumos</SelectItem>
                        <SelectItem value="fruit-receptions">Recepción de Fruta</SelectItem>
                        <SelectItem value="initial-stock">Carga Inicial por Almacén</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Asegúrate de que tu archivo Excel contenga las columnas necesarias. Puedes descargar una plantilla
                      desde la pestaña "Plantillas".
                    </AlertDescription>
                  </Alert>

                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Arrastra tu archivo Excel aquí o haz clic para seleccionar
                    </p>
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                </div>
              )}

              {mappingStep === 2 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Mapeo de Columnas</h3>
                      <p className="text-sm text-muted-foreground">
                        Relaciona las columnas de tu archivo con los campos del sistema
                      </p>
                    </div>
                    <Badge variant="outline">{importFile?.name}</Badge>
                  </div>

                  <div className="rounded-md border">
                    {/* Preview de columnas y primeras filas */}
                    {sampleColumns.length > 0 && (
                      <div className="p-4 border-b">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">Vista previa del archivo</h4>
                              {sheetNames.length > 1 && (
                                <div className="flex items-center space-x-2">
                                  <Label>Hoja:</Label>
                                  <Select
                                    value={selectedSheet ?? undefined}
                                    onValueChange={(v) => {
                                      setSelectedSheet(v)
                                      parseSheet(v)
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {sheetNames.map((s) => (
                                        <SelectItem key={s} value={s}>
                                          {s}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                        <div className="overflow-auto">
                          <table className="w-full text-sm table-auto border-collapse">
                            <thead>
                              <tr>
                                {sampleColumns.map((c) => (
                                  <th key={c} className="border px-2 py-1 text-left">
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sampleRows.map((row, idx) => (
                                <tr key={idx}>
                                  {sampleColumns.map((_, ci) => (
                                    <td key={ci} className="border px-2 py-1">
                                      {row[ci] ?? ""}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campo del Sistema</TableHead>
                          <TableHead>Requerido</TableHead>
                          <TableHead>Columna del Archivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(dynamicFields.length > 0 ? dynamicFields : requiredFields[importType])?.map((field, index) => (
                          <TableRow key={`${field.field}-${index}`}>
                            <TableCell className="font-medium">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </TableCell>
                            <TableCell>
                              {field.required ? (
                                <Badge variant="destructive" className="text-xs">
                                  Requerido
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Opcional
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={columnMapping[field.field]}
                                onValueChange={(value) => setColumnMapping({ ...columnMapping, [field.field]: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar columna" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">-- No asignar --</SelectItem>
                                  {sampleColumns.map((col) => (
                                    <SelectItem key={col} value={col}>
                                      {col}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setMappingStep(1)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleImport}>
                      Iniciar Importación
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {mappingStep === 3 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 py-8">
                  <div className="text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                      <Upload className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Importando Datos...</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Por favor espera mientras procesamos tu archivo
                    </p>
                    <Progress value={66} className="max-w-md mx-auto" />
                  </div>
                </motion.div>
              )}

              {mappingStep === 4 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4 py-8"
                >
                  <div className="text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Importación Completada</h3>
                      <p className="text-sm text-muted-foreground mb-6">Los datos se han importado correctamente</p>
                    <div className="grid gap-4 max-w-md mx-auto text-left">
                        <div className="flex justify-between p-3 bg-muted rounded-lg">
                          <span className="text-sm">Registros procesados:</span>
                          <span className="font-semibold">{importResult?.processed ?? '-'}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-green-500/10 rounded-lg">
                          <span className="text-sm">Importados exitosamente:</span>
                          <span className="font-semibold text-green-600">{importResult?.success ?? '-'}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-red-500/10 rounded-lg">
                          <span className="text-sm">Errores:</span>
                          <span className="font-semibold text-red-600">{importResult?.errors?.length ?? 0}</span>
                        </div>
                      
                        {importResult?.errors && importResult.errors.length > 0 && (
                          <div className="mt-4 p-4 bg-red-50 rounded-lg max-h-60 overflow-y-auto">
                            <h4 className="font-semibold text-sm mb-2 text-red-800">Detalles de errores:</h4>
                            <ul className="text-xs space-y-1 text-red-700">
                              {importResult.errors.slice(0, 10).map((err: any, idx: number) => (
                                <li key={idx}>
                                  Fila {err.row}: {err.error}
                                </li>
                              ))}
                              {importResult.errors.length > 10 && (
                                <li className="font-semibold">
                                  ... y {importResult.errors.length - 10} errores más
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                    <Button className="mt-6" onClick={resetImport}>
                      Importar Otro Archivo
                    </Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plantillas de Importación</CardTitle>
              <CardDescription>
                Descarga plantillas pre-configuradas para facilitar la importación de datos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                      <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Plantilla de Productos</h4>
                      <p className="text-xs text-muted-foreground">Incluye todos los campos requeridos</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => handleDownloadTemplate("products")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Plantilla
                  </Button>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <TableIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Plantilla de Inventario</h4>
                      <p className="text-xs text-muted-foreground">Para carga inicial de stock</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => handleDownloadTemplate("inventory")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Plantilla
                  </Button>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                      <FileSpreadsheet className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Plantilla de Proveedores</h4>
                      <p className="text-xs text-muted-foreground">Directorio completo de proveedores</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => handleDownloadTemplate("suppliers")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Plantilla
                  </Button>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Plantilla de Movimientos</h4>
                      <p className="text-xs text-muted-foreground">Para carga masiva de movimientos</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => handleDownloadTemplate("movements")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Plantilla
                  </Button>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                      <FileSpreadsheet className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Plantilla de Asignación de Insumos</h4>
                      <p className="text-xs text-muted-foreground">Asignar insumos a productores</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => handleDownloadTemplate("input-assignments")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Plantilla
                  </Button>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lime-500/10">
                      <FileSpreadsheet className="h-5 w-5 text-lime-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Plantilla de Recepción de Fruta</h4>
                      <p className="text-xs text-muted-foreground">Registrar recepciones de fruta</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => handleDownloadTemplate("fruit-receptions")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Plantilla
                  </Button>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                      <TableIcon className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Plantilla de Carga Inicial</h4>
                      <p className="text-xs text-muted-foreground">Carga inicial de stock por almacén</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => handleDownloadTemplate("initial-stock")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Plantilla
                  </Button>
                </div>
              </div>

              <Alert className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Las plantillas incluyen ejemplos de datos y descripciones de cada campo.
                  No modifiques los nombres de las columnas para asegurar una importación correcta.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
