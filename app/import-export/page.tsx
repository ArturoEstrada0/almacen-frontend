"use client"

import type React from "react"

import { useState } from "react"
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

export default function ImportExportPage() {
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importType, setImportType] = useState<string>("products")
  const [mappingStep, setMappingStep] = useState<number>(1)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})

  // Sample columns from uploaded file
  const sampleColumns = ["Columna A", "Columna B", "Columna C", "Columna D", "Columna E"]

  // Required fields for each import type
  const requiredFields: Record<string, Array<{ field: string; label: string; required: boolean }>> = {
    products: [
      { field: "sku", label: "SKU", required: true },
      { field: "name", label: "Nombre", required: true },
      { field: "description", label: "Descripción", required: false },
      { field: "category", label: "Categoría", required: true },
      { field: "costPrice", label: "Precio de Costo", required: true },
      { field: "salePrice", label: "Precio de Venta", required: true },
      { field: "minStock", label: "Stock Mínimo", required: true },
      { field: "maxStock", label: "Stock Máximo", required: true },
      { field: "unitOfMeasure", label: "Unidad de Medida", required: true },
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
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
      setMappingStep(2)
    }
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
    console.log("[v0] Importing with mapping:", columnMapping)
    setMappingStep(3)
    // Simulate import process
    setTimeout(() => {
      setMappingStep(4)
    }, 2000)
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
                        <span className="font-semibold">150</span>
                      </div>
                      <div className="flex justify-between p-3 bg-green-500/10 rounded-lg">
                        <span className="text-sm">Importados exitosamente:</span>
                        <span className="font-semibold text-green-600">148</span>
                      </div>
                      <div className="flex justify-between p-3 bg-red-500/10 rounded-lg">
                        <span className="text-sm">Errores:</span>
                        <span className="font-semibold text-red-600">2</span>
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
