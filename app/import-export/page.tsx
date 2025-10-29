"use client"

import type React from "react"

import { useState, useRef } from "react"
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

export default function ImportExportPage() {
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importType, setImportType] = useState<string>("products")
  const [mappingStep, setMappingStep] = useState<number>(1)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})

  // Parsed columns / preview rows
  const [sampleColumns, setSampleColumns] = useState<string[]>([])
  const [sampleRows, setSampleRows] = useState<string[][]>([])
  // Sheets handling for multi-sheet workbooks
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null)
  const workbookRef = useRef<any>(null)
  const [importResult, setImportResult] = useState<any | null>(null)

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

            // Auto-map by exact match on field or label (case-insensitive)
            const newMapping: Record<string, string> = {}
            requiredFields[importType]?.forEach((f) => {
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

  const handleExport = (type: string) => {
    console.log("[v0] Exporting:", type)
    alert(`Exportando ${type}...`)
  }

  const handleDownloadTemplate = (type: string) => {
    console.log("[v0] Downloading template:", type)
    alert(`Descargando plantilla de ${type}...`)
  }

  const handleImport = () => {
    // Validate required mappings
    const missingRequired = (requiredFields[importType] || [])
      .filter((f) => f.required)
      .filter((f) => !columnMapping[f.field] || columnMapping[f.field] === "__none__")

    if (missingRequired.length > 0) {
      alert(
        `Faltan columnas requeridas: ${missingRequired.map((m) => m.label).join(", ")}. Por favor relacionalas antes de importar.`
      )
      return
    }

    if (!importFile) {
      alert('No se ha seleccionado un archivo')
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
    fetch(`${apiUrl}/api/imports`, {
      method: 'POST',
      body: fd,
      // NOTE: include credentials or Authorization header if your API requires auth
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
      })
      .catch((err) => {
        console.error('Import error', err)
        alert('Error durante la importación: ' + (err.message || err))
        setMappingStep(1)
      })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar / Exportar</h1>
        <p className="text-muted-foreground">Gestiona tus datos con archivos Excel</p>
      </div>

      <Tabs defaultValue="export" className="space-y-6">
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
                  <Select defaultValue="xlsx">
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
                      <Checkbox id="include-inactive" defaultChecked />
                      <label htmlFor="include-inactive" className="text-sm">
                        Productos inactivos
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include-images" />
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
                  <Select defaultValue="all">
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
                      <Checkbox id="include-zero" />
                      <label htmlFor="include-zero" className="text-sm">
                        Productos con stock 0
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include-lots" defaultChecked />
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
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Fin</Label>
                    <Input type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Movimiento</Label>
                  <Select defaultValue="all">
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
                      <Checkbox id="include-inactive-suppliers" defaultChecked />
                      <label htmlFor="include-inactive-suppliers" className="text-sm">
                        Proveedores inactivos
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include-products" defaultChecked />
                      <label htmlFor="include-products" className="text-sm">
                        Productos asociados
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
                        {requiredFields[importType]?.map((field) => (
                          <TableRow key={field.field}>
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
                    </div>
                    <Button className="mt-6" onClick={() => setMappingStep(1)}>
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
