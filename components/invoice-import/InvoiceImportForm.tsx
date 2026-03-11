"use client"
import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { createProduct, useProducts } from '@/lib/hooks/use-products'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useSuppliers } from '@/lib/hooks/use-suppliers'
import { useWarehouses } from '@/lib/hooks/use-warehouses'
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table'
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

interface InvoiceImportFormProps {
  initialSupplierId?: string
  initialWarehouseId?: string
  onImportComplete?: (result: { supplierId?: string; warehouseId?: string; items: any[] }) => void
}

// Campos del sistema que se pueden mapear desde columnas del XML
const SYSTEM_FIELDS = [
  { field: 'description', label: 'Descripción',   required: true },
  { field: 'quantity',    label: 'Cantidad',       required: true },
  { field: 'unitPrice',  label: 'Precio Unitario', required: true },
  { field: 'productCode',label: 'SKU / Código',    required: false },
]

// Sinónimos conocidos por campo — orden de prioridad descendente
const FIELD_SYNONYMS: Record<string, string[]> = {
  description: [
    'Descripcion', 'Descripción', 'Description', 'description', 'descripcion',
    'Concepto', 'concepto', 'Detalle', 'detalle', 'Producto', 'producto',
    'Nombre', 'nombre', 'desc', 'DESC',
  ],
  quantity: [
    'Cantidad', 'cantidad', 'Quantity', 'quantity',
    'Cant', 'cant', 'qty', 'QTY', 'Qty',
  ],
  unitPrice: [
    'ValorUnitario', 'valorUnitario', 'valor_unitario',
    'UnitPrice', 'unitPrice', 'unit_price',
    'PrecioUnitario', 'precioUnitario', 'precio_unitario',
    'Precio', 'precio', 'Price', 'price',
    'Importe', 'importe', 'Monto', 'monto',
  ],
  productCode: [
    'NoIdentificacion', 'noIdentificacion', 'no_identificacion',
    'ClaveProdServ', 'claveProdServ', 'clave_prod_serv',
    'Codigo', 'codigo', 'Código', 'código',
    'SKU', 'sku', 'Sku',
    'Referencia', 'referencia', 'Clave', 'clave', 'Code', 'code',
  ],
}

/** Detecta automáticamente qué clave XML corresponde a cada campo del sistema */
function autoDetectMapping(keys: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  const keysLower = keys.map((k) => k.toLowerCase())

  for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    // 1. Coincidencia exacta (respetando mayúsculas) en orden de prioridad
    const exactMatch = synonyms.find((s) => keys.includes(s))
    if (exactMatch) { result[field] = exactMatch; continue }

    // 2. Coincidencia sin distinguir mayúsculas
    const ciMatch = synonyms.find((s) => keysLower.includes(s.toLowerCase()))
    if (ciMatch) {
      result[field] = keys[keysLower.indexOf(ciMatch.toLowerCase())]
      continue
    }

    // 3. La clave XML contiene algún sinónimo como subcadena
    const subMatch = keys.find((k) =>
      synonyms.some((s) => k.toLowerCase().includes(s.toLowerCase()))
    )
    if (subMatch) { result[field] = subMatch }
  }
  return result
}

export default function InvoiceImportForm({ initialSupplierId = '', initialWarehouseId = '', onImportComplete }: InvoiceImportFormProps) {
  const { toast } = useToast()
  // steps: 1=upload, 1.5=column-map (represented as step=2), 2=line-map (step=3), processing=4, done=5
  // We use numbers 1-5 for clarity
  const [step, setStep] = useState<1|2|3|4|5>(1)
  const [file, setFile] = useState<File | null>(null)
  const [lines, setLines] = useState<any[]>([])
  const [rawKeys, setRawKeys] = useState<string[]>([])          // claves XML originales
  const [colMapping, setColMapping] = useState<Record<string,string>>({}) // campo→clave XML
  const [supplierId, setSupplierId] = useState(initialSupplierId)
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId)
  const [importResult, setImportResult] = useState<any | null>(null)
  const [parseProgress, setParseProgress] = useState(0)
  const { suppliers } = useSuppliers()
  const { warehouses } = useWarehouses()
  const { products: allProducts, mutate: mutateProducts } = useProducts()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const supplierOptions: ComboBoxOption[] = (suppliers || []).map((s: any) => ({ value: s.id, label: s.name, subtitle: s.rfc || '' }))
  const warehouseOptions: ComboBoxOption[] = (warehouses || []).map((w: any) => ({ value: w.id, label: w.name }))

  const getAuthToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch { return null }
  }

  const apiBase = () => {
    const raw = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')
    return raw.endsWith('/api') ? raw : `${raw}/api`
  }

  // Inicia simulación de progreso (igual que import-export)
  const startProgressSimulation = () => {
    setParseProgress(0)
    progressIntervalRef.current = setInterval(() => {
      setParseProgress((prev) => {
        if (prev >= 85) { clearInterval(progressIntervalRef.current!); return prev }
        return prev + Math.random() * 12
      })
    }, 300)
  }

  const stopProgressSimulation = (success: boolean) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    setParseProgress(success ? 100 : 0)
  }

  // Al seleccionar o dropear archivo → parsea automáticamente
  async function handleFileSelected(selected: File | null) {
    if (!selected?.name.endsWith('.xml')) {
      toast({ title: 'Archivo no válido', description: 'Por favor selecciona un archivo .xml', variant: 'destructive' })
      return
    }
    setFile(selected)
    setStep(3)
    startProgressSimulation()
    try {
      const token = await getAuthToken()
      const fd = new FormData()
      fd.append('file', selected)
      const res = await fetch(`${apiBase()}/invoice-import/parse`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      if (!res.ok) throw new Error(await res.text() || `Error ${res.status}`)
      const data = await res.json()
      stopProgressSimulation(true)
      const parsedLines = (data.lines || []).map((l: any) => ({ ...l, selectedProductId: l.suggestions?.[0]?.id || null }))
      setLines(parsedLines)
      const keys: string[] = data.rawKeys || []
      setRawKeys(keys)
      // Auto-mapear usando sinónimos conocidos (CFDI + variantes comunes)
      const autoMap = autoDetectMapping(keys)
      setColMapping(autoMap)
      setStep(2)
    } catch (err) {
      stopProgressSimulation(false)
      toast({ title: 'Error al procesar XML', description: (err as any)?.message || String(err), variant: 'destructive' })
      setStep(1)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelected(e.dataTransfer.files?.[0] || null)
  }

  function updateLine(i: number, patch: any) {
    setLines((cur) => cur.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  // Aplica el mapeo de columnas a las líneas (re-extrae los valores desde rawData)
  function applyColumnMapping() {
    setLines((cur) => cur.map((l) => {
      const raw = l.rawData || {}
      return {
        ...l,
        description: colMapping.description ? (raw[colMapping.description] ?? l.description) : l.description,
        quantity:    colMapping.quantity    ? Number(raw[colMapping.quantity]    ?? l.quantity)    : l.quantity,
        unitPrice:   colMapping.unitPrice   ? Number(raw[colMapping.unitPrice]   ?? l.unitPrice)   : l.unitPrice,
        productCode: colMapping.productCode ? (raw[colMapping.productCode] ?? l.productCode)       : l.productCode,
      }
    }))
    setStep(3)
  }

  async function handleConfirm() {
    const items = lines.map((l) => ({ productId: l.selectedProductId, quantity: l.quantity, unitPrice: l.unitPrice }))
    setStep(4)
    startProgressSimulation()
    // Esperar al menos 1.6s para que la animación sea visible
    const minDelay = new Promise<void>((r) => setTimeout(r, 1600))
    try {
      if (onImportComplete) {
        // Modo embebido: solo animación, el callback se llama desde el botón en step 5
        await minDelay
        stopProgressSimulation(true)
        setStep(5)
      } else {
        const token = await getAuthToken()
        const res = await fetch(`${apiBase()}/invoice-import/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ supplierId, warehouseId, items }),
        })
        const result = await res.json()
        await minDelay
        stopProgressSimulation(true)
        setImportResult(result)
        setStep(5)
      }
    } catch (err) {
      await minDelay
      stopProgressSimulation(false)
      toast({ title: 'Error al confirmar', description: (err as any)?.message || String(err), variant: 'destructive' })
      setStep(3)
    }
  }

  function reset() {
    setStep(1); setFile(null); setLines([]); setImportResult(null); setParseProgress(0)
    setRawKeys([]); setColMapping({})
    setSupplierId(initialSupplierId); setWarehouseId(initialWarehouseId)
  }

  const mappedCount = lines.filter(l => l.selectedProductId).length

  // Opciones del catálogo completo para ComboBox
  const productOptions: ComboBoxOption[] = (allProducts || []).map((p: any) => ({
    value: p.id,
    label: p.name,
    subtitle: p.sku,
  }))

  // Indicador de pasos
  const steps = [
    { n: 1, label: 'Subir XML' },
    { n: 2, label: 'Mapeo de columnas' },
    { n: 3, label: 'Mapear partidas' },
    { n: 4, label: 'Procesando' },
    { n: 5, label: 'Completado' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Factura XML</CardTitle>
        <CardDescription>Carga un CFDI / factura XML, relaciona las partidas con productos del catálogo y genera una orden de compra.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Indicador de pasos ── */}
        <div className="flex items-center gap-1">
          {steps.map((s, idx) => (
            <React.Fragment key={s.n}>
              <div className="flex items-center gap-1.5">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors
                  ${step === s.n ? 'bg-primary text-primary-foreground' : step > s.n ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {step > s.n ? <CheckCircle2 className="h-3 w-3" /> : s.n}
                </div>
                <span className={`text-xs hidden md:inline ${step === s.n ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
              </div>
              {idx < steps.length - 1 && <div className={`flex-1 h-px ${step > s.n ? 'bg-green-500' : 'bg-muted'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* ── PASO 1: Zona de carga ── */}
        {step === 1 && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                El sistema detectará automáticamente las partidas del XML y sugerirá productos del catálogo por SKU o palabras clave.
              </AlertDescription>
            </Alert>

            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Arrastra tu factura XML aquí o haz clic para seleccionar</p>
              <p className="text-xs text-muted-foreground">Formatos soportados: CFDI 3.3 / 4.0 (.xml)</p>
              {file && (
                <Badge variant="secondary" className="mt-3 gap-1 w-fit mx-auto flex">
                  <FileText className="h-3 w-3" /> {file.name}
                </Badge>
              )}
              <input ref={fileInputRef} type="file" accept=".xml" className="hidden"
                onChange={(e) => handleFileSelected(e.target.files?.[0] || null)} />
            </div>
          </div>
        )}

        {/* ── PASO 2: Mapeo de columnas XML ── */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-semibold">Mapeo de Columnas</h3>
                <p className="text-sm text-muted-foreground">Relaciona los campos del sistema con los atributos detectados en el XML</p>
              </div>
              <Badge variant="outline">{file?.name}</Badge>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campo del sistema</TableHead>
                    <TableHead>Requerido</TableHead>
                    <TableHead>Atributo en el XML</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SYSTEM_FIELDS.map((sf) => (
                    <TableRow key={sf.field}>
                      <TableCell className="font-medium">
                        {sf.label}
                        {sf.required && <span className="text-red-500 ml-1">*</span>}
                      </TableCell>
                      <TableCell>
                        {sf.required
                          ? <Badge variant="destructive" className="text-xs">Requerido</Badge>
                          : <Badge variant="secondary" className="text-xs">Opcional</Badge>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={colMapping[sf.field] || '__none__'}
                          onValueChange={(v) => setColMapping((m) => ({ ...m, [sf.field]: v === '__none__' ? '' : v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar atributo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— No asignar —</SelectItem>
                            {rawKeys.map((k) => (
                              <SelectItem key={k} value={k}>{k}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Vista previa de los primeros 3 conceptos del XML */}
            {lines.length > 0 && rawKeys.length > 0 && (
              <div className="rounded-md border">
                <div className="p-3 border-b bg-muted/30">
                  <p className="text-sm font-medium">Vista previa del XML ({lines.length} partidas detectadas)</p>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-xs table-auto border-collapse">
                    <thead>
                      <tr>
                        {rawKeys.slice(0, 8).map((k) => (
                          <th key={k} className="border px-2 py-1 text-left font-medium bg-muted/20">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lines.slice(0, 3).map((l, i) => (
                        <tr key={i}>
                          {rawKeys.slice(0, 8).map((k) => (
                            <td key={k} className="border px-2 py-1 text-muted-foreground">
                              {String(l.rawData?.[k] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={reset}>← Volver</Button>
              <Button onClick={applyColumnMapping} className="gap-2">
                Continuar al mapeo de productos <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── PASO 3: Mapeo de partidas ── */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Encabezado con badges */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-semibold">Mapeo de Partidas</h3>
                <p className="text-sm text-muted-foreground">Relaciona cada línea del XML con un producto del catálogo</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" />{lines.length} partidas</Badge>
                <Badge variant={mappedCount === lines.length ? 'default' : 'outline'} className="gap-1">
                  <Package className="h-3 w-3" />{mappedCount}/{lines.length} mapeadas
                </Badge>
                <Badge variant="outline">{file?.name}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-xs h-7">
                  Editar mapeo de columnas
                </Button>
              </div>
            </div>

            {/* Proveedor y Almacén — sección requerida con indicador visual */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border-2 rounded-lg transition-colors
              ${ (!supplierId || !warehouseId)
                ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20'
                : 'border-green-500 bg-green-50/40 dark:bg-green-950/20' }`}>
              {/* Encabezado del área */}
              <div className="sm:col-span-2 flex items-center gap-2">
                {(!supplierId || !warehouseId)
                  ? <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  : <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                <span className={`text-sm font-semibold ${ (!supplierId || !warehouseId) ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400' }`}>
                  {(!supplierId || !warehouseId)
                    ? 'Completa el proveedor y almacén antes de confirmar'
                    : 'Proveedor y almacén seleccionados — listo para generar'}
                </span>
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1">Proveedor <span className="text-red-500">*</span></Label>
                <ComboBox options={supplierOptions} value={supplierId} onChange={setSupplierId}
                  placeholder="Selecciona proveedor" searchPlaceholder="Buscar proveedor..." />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1">Almacén destino <span className="text-red-500">*</span></Label>
                <ComboBox options={warehouseOptions} value={warehouseId} onChange={setWarehouseId}
                  placeholder="Selecciona almacén" searchPlaceholder="Buscar almacén..." />
              </div>
            </div>

            {/* Tabla de partidas */}
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Descripción del XML</TableHead>
                    <TableHead className="w-24 text-right">Cantidad</TableHead>
                    <TableHead className="w-28 text-right">Precio unit.</TableHead>
                    <TableHead className="min-w-[280px]">Producto en catálogo / Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell className="align-top py-3">
                        <p className="text-sm font-medium">{l.description || <em className="text-muted-foreground">(sin descripción)</em>}</p>
                        {l.productCode && <p className="text-xs text-muted-foreground mt-0.5">SKU: {l.productCode}</p>}
                      </TableCell>
                      <TableCell className="align-top py-3 text-right">{l.quantity}</TableCell>
                      <TableCell className="align-top py-3 text-right">
                        ${l.unitPrice?.toFixed ? l.unitPrice.toFixed(2) : l.unitPrice}
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <div className="space-y-2">
                          {/* ComboBox con catálogo completo — búsqueda en vivo */}
                          <ComboBox
                            options={productOptions}
                            value={l.selectedProductId || ''}
                            onChange={(v) => updateLine(i, { selectedProductId: v || null })}
                            placeholder={l.suggestions?.length
                              ? `${l.suggestions.length} sugerencia${l.suggestions.length > 1 ? 's' : ''} — busca o selecciona`
                              : 'Buscar en catálogo…'}
                            searchPlaceholder="Escribe nombre o SKU…"
                            emptyMessage="Sin resultados. Puedes crear el producto abajo."
                          />
                          {/* Sugerencias rápidas del backend (chips) */}
                          {(l.suggestions || []).length > 0 && !l.selectedProductId && (
                            <div className="flex flex-wrap gap-1">
                              {(l.suggestions as any[]).slice(0, 4).map((s: any) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => updateLine(i, { selectedProductId: s.id })}
                                  className="text-xs px-2 py-0.5 rounded-full border border-primary/40 bg-primary/5 hover:bg-primary/15 transition-colors"
                                >
                                  {s.sku} — {s.name}
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Crear solo si no hay producto seleccionado */}
                          {!l.selectedProductId && (
                            <Button size="sm" variant="outline" disabled={!!l.creating} className="w-full text-xs"
                              onClick={async () => {
                                updateLine(i, { creating: true })
                                try {
                                  const sku = l.productCode || `IMP-${Date.now()}`
                                  const created = await createProduct({
                                    sku, name: l.description || sku,
                                    description: l.description || undefined,
                                    type: 'insumo', costPrice: l.unitPrice || 0,
                                    salePrice: l.unitPrice || 0, isActive: true,
                                  })
                                  await mutateProducts()  // refresca el catálogo para que aparezca en el ComboBox
                                  updateLine(i, { selectedProductId: created.id, creating: false })
                                  toast({ title: 'Producto creado', description: `"${created.name}" fue añadido al catálogo` })
                                } catch (err) {
                                  updateLine(i, { creating: false })
                                  toast({ title: 'Error al crear producto', description: (err as any)?.message || String(err), variant: 'destructive' })
                                }
                              }}>
                              {l.creating ? 'Creando…' : '+ Crear producto nuevo'}
                            </Button>
                          )}
                          {l.selectedProductId && (
                            <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground"
                              onClick={() => updateLine(i, { selectedProductId: null })}>
                              ✕ Quitar selección
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>← Columnas</Button>
              <Button
                onClick={handleConfirm}
                disabled={mappedCount === 0 || !supplierId || !warehouseId}
                title={!supplierId || !warehouseId ? 'Selecciona proveedor y almacén antes de continuar' : undefined}
                className="gap-2">
                Generar orden de compra <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── PASO 4: Procesando ── */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 py-8">
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Upload className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Generando orden de compra…</h3>
              <p className="text-sm text-muted-foreground mb-4">Por favor espera un momento</p>
              <div className="max-w-md mx-auto space-y-3">
                <Progress value={parseProgress} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {parseProgress < 50 ? 'Preparando datos…' : parseProgress < 90 ? 'Guardando partidas…' : '\u00a1Listo!'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PASO 5: Resultado ── */}
        {step === 5 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 py-8">
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                {onImportComplete ? 'Partidas listas para aplicar' : '\u00a1Importación Completada!'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {onImportComplete
                  ? 'Revisa el resumen y haz clic en "Aplicar a orden de compra" para añadir las partidas.'
                  : 'La orden de compra fue generada correctamente'}
              </p>
            </div>
            <div className="grid gap-4 max-w-md mx-auto text-left">
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Partidas procesadas:</span>
                <span className="font-semibold">{lines.length}</span>
              </div>
              <div className="flex justify-between p-3 bg-green-500/10 rounded-lg">
                <span className="text-sm">Productos mapeados:</span>
                <span className="font-semibold text-green-600">{mappedCount}</span>
              </div>
              {importResult?.id && (
                <div className="flex justify-between p-3 bg-primary/5 rounded-lg">
                  <span className="text-sm">Orden de compra:</span>
                  <Badge variant="outline">#{importResult.id}</Badge>
                </div>
              )}
            </div>
            <div className="flex justify-center gap-3 mt-4 flex-wrap">
              {onImportComplete ? (
                <>
                  <Button variant="outline" onClick={() => setStep(3)}>Revisar partidas</Button>
                  <Button className="gap-2" onClick={() => {
                    const items = lines.map((l) => ({ productId: l.selectedProductId, quantity: l.quantity, unitPrice: l.unitPrice }))
                    onImportComplete({ supplierId, warehouseId, items })
                  }}>
                    <CheckCircle2 className="h-4 w-4" /> Aplicar a orden de compra
                  </Button>
                </>
              ) : (
                <Button onClick={reset} className="gap-2">
                  <Upload className="h-4 w-4" /> Importar otra factura
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
