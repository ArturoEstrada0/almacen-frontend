"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ComboBox } from "@/components/ui/combobox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { Plus, Search, Eye, Edit, DollarSign, Package, Trash2, ChevronsUpDown, ArrowUp, ArrowDown, Upload, FileText, Truck, Loader2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { compressDocument } from "@/lib/document-compression"
import type { ShipmentStatus } from "@/lib/types"
import {
  useShipments,
  useFruitReceptions,
  useProducers,
  createShipment as apiCreateShipment,
  createShipmentWithDocuments,
  updateShipment as apiUpdateShipment,
  updateShipmentWithDocuments,
  updateShipmentStatus as apiUpdateShipmentStatus,
  deleteShipment as apiDeleteShipment,
} from "@/lib/hooks/use-producers"
import { useSuppliers } from "@/lib/hooks/use-suppliers"
import { useCustomers } from "@/lib/hooks/use-customers"
import { mutate as globalMutate } from "swr"
import { ProtectedCreate, ProtectedUpdate, ProtectedDelete } from "@/components/auth/protected-action"
import Spinner2 from "@/components/ui/spinner2"
import { TablePagination, usePagination } from "@/components/ui/table-pagination"

const statusConfig: Record<
  ShipmentStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  embarcada: { label: "Embarcada", variant: "secondary" },
  "en-transito": { label: "En Tránsito", variant: "default" },
  recibida: { label: "Recibida", variant: "outline" },
  vendida: { label: "Vendida", variant: "default" },
}

export function ShipmentsTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [sortBy, setSortBy] = useState<"producer" | "code" | "date">("producer")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const [selectedReceptions, setSelectedReceptions] = useState<string[]>([])
  const [carrier, setCarrier] = useState("")
  const [carrierContact, setCarrierContact] = useState("")
  const [invoiceAmount, setInvoiceAmount] = useState("")
  const [carrierInvoiceAmount, setCarrierInvoiceAmount] = useState("")
  const [shipmentInvoiceFile, setShipmentInvoiceFile] = useState<File | null>(null)
  const [carrierInvoiceFile, setCarrierInvoiceFile] = useState<File | null>(null)
  const [waybillFile, setWaybillFile] = useState<File | null>(null)
  const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")

  // For edit dialog (edit general shipment info and receptions)
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null)
  const [editSelectedReceptions, setEditSelectedReceptions] = useState<string[]>([])
  const [editCarrier, setEditCarrier] = useState("")
  const [editCarrierContact, setEditCarrierContact] = useState("")
  const [editInvoiceAmount, setEditInvoiceAmount] = useState("")
  const [editCarrierInvoiceAmount, setEditCarrierInvoiceAmount] = useState("")
  const [editShipmentInvoiceFile, setEditShipmentInvoiceFile] = useState<File | null>(null)
  const [editCarrierInvoiceFile, setEditCarrierInvoiceFile] = useState<File | null>(null)
  const [editWaybillFile, setEditWaybillFile] = useState<File | null>(null)
  const [editShipmentInvoiceUrl, setEditShipmentInvoiceUrl] = useState<string | null>(null)
  const [editCarrierInvoiceUrl, setEditCarrierInvoiceUrl] = useState<string | null>(null)
  const [editWaybillUrl, setEditWaybillUrl] = useState<string | null>(null)
  const [initialEditShipmentInvoiceUrl, setInitialEditShipmentInvoiceUrl] = useState<string | null>(null)
  const [initialEditCarrierInvoiceUrl, setInitialEditCarrierInvoiceUrl] = useState<string | null>(null)
  const [initialEditWaybillUrl, setInitialEditWaybillUrl] = useState<string | null>(null)
  const [editShipmentDate, setEditShipmentDate] = useState("")
  const [editNotes, setEditNotes] = useState("")

  // For update dialog (status)
  const [selectedShipment, setSelectedShipment] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<ShipmentStatus>("embarcada")
  const [arrivalDate, setArrivalDate] = useState("")
  const [salePrice, setSalePrice] = useState("")
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0])
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0])
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [updateNotes, setUpdateNotes] = useState("")

  // Estado para el modal de detalles
  const [viewShipment, setViewShipment] = useState<any | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  // Modal to inform user that backend does not accept files for shipments
  const [isFilesNotSupportedDialogOpen, setIsFilesNotSupportedDialogOpen] = useState(false)
  const [pendingCreatePayload, setPendingCreatePayload] = useState<any | null>(null)
  const [pendingEditPayload, setPendingEditPayload] = useState<any | null>(null)
  const [pendingEditId, setPendingEditId] = useState<string | null>(null)
  const [isShipmentErrorDialogOpen, setIsShipmentErrorDialogOpen] = useState(false)
  const [shipmentErrorMessage, setShipmentErrorMessage] = useState("")
  const [isCreatingShipment, setIsCreatingShipment] = useState(false)

  const { fruitReceptions } = useFruitReceptions()
  const { shipments, mutate: mutateShipments, isLoading } = useShipments()
  const { producers } = useProducers()
  const { suppliers } = useSuppliers("transporte")
  const { customers, fetchCustomers } = useCustomers()

  const pendingReceptions = (fruitReceptions || []).filter((r) => r.shipmentStatus === "pendiente")

  const hasCreateInvoiceData = !!shipmentInvoiceFile && Number(invoiceAmount || 0) > 0
  const hasCreateCarrierInvoiceData = !!carrierInvoiceFile && Number(carrierInvoiceAmount || 0) > 0
  const hasEditInvoiceData = !!editShipmentInvoiceFile && Number(editInvoiceAmount || 0) > 0
  const hasEditCarrierInvoiceData = !!editCarrierInvoiceFile && Number(editCarrierInvoiceAmount || 0) > 0

  const getProducerNameForShipment = (shipment: any) => {
    if (shipment?.producer?.name) return String(shipment.producer.name).toLowerCase()
    // Try embedded receptions
    const embedded = Array.isArray(shipment.receptions) && shipment.receptions.length > 0
      ? shipment.receptions
      : Array.isArray(shipment.receptionIds) && Array.isArray(fruitReceptions)
        ? (fruitReceptions || []).filter((r: any) => shipment.receptionIds.includes(r.id))
        : []

    if (embedded && embedded.length > 0) {
      const prodId = embedded[0].producerId
      const prod = (producers || []).find((p: any) => String(p.id) === String(prodId))
      if (prod?.name) return String(prod.name).toLowerCase()
    }

    // Fallback to code/number
    return String(shipment.code || shipment.shipmentNumber || "").toLowerCase()
  }

  const getStoredFileName = (url: string | null, fallbackName: string) => {
    if (!url) return fallbackName
    try {
      const noQuery = url.split("?")[0]
      const rawName = decodeURIComponent(noQuery.substring(noQuery.lastIndexOf("/") + 1))
      return rawName.replace(/^\d+-/, "") || fallbackName
    } catch {
      return fallbackName
    }
  }

  const compressShipmentDocument = async (file: File | null) => {
    if (!file) return null
    const compressed = await compressDocument(file, {
      forceZip: true,
      allowedExtensions: [".pdf", ".xml"],
    })
    return compressed.file
  }

  const appendCompressedDocument = async (form: FormData, fieldName: string, file: File | null) => {
    const compressedFile = await compressShipmentDocument(file)
    if (compressedFile) {
      form.append(fieldName, compressedFile)
    }
  }

  const openShipmentErrorDialog = (message: string) => {
    setShipmentErrorMessage(message || "Ocurrió un error al procesar el embarque")
    setIsShipmentErrorDialogOpen(true)
  }

  const sortedShipments = [...(shipments || [])].sort((a, b) => {
    switch (sortBy) {
      case 'code': {
        const av = String((a as any).code || (a as any).shipmentNumber || "").toLowerCase()
        const bv = String((b as any).code || (b as any).shipmentNumber || "").toLowerCase()
        return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      case 'date': {
        const aTime = new Date((a as any).date || (a as any).shipmentDate || 0).getTime() || 0
        const bTime = new Date((b as any).date || (b as any).shipmentDate || 0).getTime() || 0
        return sortOrder === 'asc' ? aTime - bTime : bTime - aTime
      }
      case 'producer':
      default: {
        const aName = getProducerNameForShipment(a)
        const bName = getProducerNameForShipment(b)
        return sortOrder === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName)
      }
    }
  })

  const filteredShipments = (sortedShipments || []).filter((shipment) => {
    const number = (shipment as any).shipmentNumber || (shipment as any).code || ""
    return number.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Pagination
  const { pagedItems: pagedShipments, paginationProps } = usePagination(filteredShipments, 20)

  const selectedReceptionsData = pendingReceptions.filter((r) => selectedReceptions.includes(r.id))
  const totalBoxes = selectedReceptionsData.reduce((sum, r) => sum + Number(r.boxes || 0), 0)
  const producersInvolved = new Set(selectedReceptionsData.map((r) => r.producerId)).size
  const selectedShipmentData = (shipments || []).find((s) => s.id === selectedShipment)

  const selectedShipmentCustomer = selectedShipmentData?.customerId
    ? (customers || []).find((c: any) => c.id === selectedShipmentData.customerId)
    : null

  const calculatedDueDate = (() => {
    if (!invoiceDate) return ""
    const baseDate = new Date(`${invoiceDate}T00:00:00`)
    if (Number.isNaN(baseDate.getTime())) return ""
    const creditDays = Number(selectedShipmentCustomer?.creditDays || 0)
    baseDate.setDate(baseDate.getDate() + creditDays)
    return baseDate.toISOString().split("T")[0]
  })()

  const handleToggleReception = (receptionId: string) => {
    setSelectedReceptions((prev) =>
      prev.includes(receptionId) ? prev.filter((id) => id !== receptionId) : [...prev, receptionId],
    )
  }

  const handleCreateShipment = () => {
    if (isCreatingShipment) return
    setIsCreatingShipment(true)
    ;(async () => {
      try {
        const payload: any = {
          receptionIds: selectedReceptions,
          date: shipmentDate,
          carrier,
          notes,
        }
        if (carrierContact) payload.driver = carrierContact
        // Try to resolve customerId and carrierId for traceability/accounting
        const matchedCustomer = (customers || []).find((c: any) => String(c.name) === String(carrierContact))
        if (matchedCustomer?.id) payload.customerId = matchedCustomer.id
        const matchedCarrier = (suppliers || []).find((s: any) => {
          const candidate = String(s.businessName || s.name || s.id)
          return candidate === String(carrier)
        })
        if (matchedCarrier?.id) payload.carrierId = matchedCarrier.id
        if (invoiceAmount) payload.invoiceAmount = Number(invoiceAmount)
        if (carrierInvoiceAmount) payload.carrierInvoiceAmount = Number(carrierInvoiceAmount)
        // Normalize and validate receptionIds
        payload.receptionIds = Array.isArray(payload.receptionIds) ? payload.receptionIds.map(String) : []
        if (!payload.receptionIds || payload.receptionIds.length === 0) {
          openShipmentErrorDialog("Seleccione al menos una recepción antes de crear el embarque")
          return
        }
        if (shipmentInvoiceFile || carrierInvoiceFile || waybillFile) {
          // Build FormData to send files
          const form = new FormData()
          payload.receptionIds.forEach((id: string) => form.append('receptionIds', id))
          if (payload.date) form.append('date', payload.date)
          if (payload.carrier) form.append('carrier', payload.carrier)
          if (payload.driver) form.append('driver', payload.driver)
          if (payload.notes) form.append('notes', payload.notes)
          if (invoiceAmount) form.append('invoiceAmount', String(invoiceAmount))
          if (carrierInvoiceAmount) form.append('carrierInvoiceAmount', String(carrierInvoiceAmount))
          await appendCompressedDocument(form, 'shipmentInvoiceFile', shipmentInvoiceFile)
          await appendCompressedDocument(form, 'carrierInvoiceFile', carrierInvoiceFile)
          await appendCompressedDocument(form, 'waybillFile', waybillFile)

          const created: any = await createShipmentWithDocuments(form)
          // continue normally after creation
          await mutateShipments()
          await globalMutate("fruit-receptions")
          await globalMutate("accounts-receivable")
          await globalMutate("accounts-payable")
          // Reset form
          setSelectedReceptions([])
          setCarrier("")
          setCarrierContact("")
          setInvoiceAmount("")
          setCarrierInvoiceAmount("")
          setShipmentInvoiceFile(null)
          setCarrierInvoiceFile(null)
          setWaybillFile(null)
          setShipmentDate(new Date().toISOString().split("T")[0])
          setNotes("")
          setIsCreateDialogOpen(false)
          console.log("Created shipment", created)
          return
        }
        const created: any = await apiCreateShipment(payload)
  // Refresh lists
  await mutateShipments()
  // Refresh receptions list
  await globalMutate("fruit-receptions")
  await globalMutate("accounts-receivable")
  await globalMutate("accounts-payable")
        // Reset form
        setSelectedReceptions([])
        setCarrier("")
        setCarrierContact("")
        setInvoiceAmount("")
        setCarrierInvoiceAmount("")
        setShipmentInvoiceFile(null)
        setCarrierInvoiceFile(null)
        setWaybillFile(null)
        setShipmentDate(new Date().toISOString().split("T")[0])
        setNotes("")
        setIsCreateDialogOpen(false)
        console.log("Created shipment", created)
      } catch (err) {
        const e: any = err || {}
        console.error("Failed creating shipment", e)
        // Build helpful message
        let msg = e.message || String(e)
        if (e.status) msg = `(${e.status}) ${msg}`
        if (e.errors) msg += "\nErrors: " + JSON.stringify(e.errors)
        if (e.technicalDetails) msg += "\nDetails: " + JSON.stringify(e.technicalDetails)
        if (e.raw && typeof e.raw === 'string' && e.raw.trim()) msg += "\nResponse: " + e.raw
        openShipmentErrorDialog(`Error al crear embarque: ${msg}`)
      } finally {
        setIsCreatingShipment(false)
      }
    })()
  }

  useEffect(() => {
    fetchCustomers().catch(() => {})
  }, [])

  useEffect(() => {
    if (isCreateDialogOpen || isEditDialogOpen) {
      // Load customers for the contact selector when dialogs open
      fetchCustomers().catch(() => {})
    }
  }, [isCreateDialogOpen, isEditDialogOpen, fetchCustomers])

  const handleUpdateShipment = () => {
    ;(async () => {
      try {
        if (!selectedShipment) throw new Error("No shipment selected")
        const salePriceNumber = updateStatus === "vendida" && salePrice ? Number(salePrice) : undefined
        const updated = await apiUpdateShipmentStatus(
          selectedShipment,
          updateStatus,
          salePriceNumber,
          updateStatus === "vendida"
            ? {
                saleDate,
                invoiceDate,
                invoiceNumber: invoiceNumber?.trim() || (selectedShipmentData as any)?.code,
              }
            : undefined,
        )
        await mutateShipments()
        await globalMutate("accounts-receivable")
        setIsUpdateDialogOpen(false)
        console.log("Updated shipment", updated)
      } catch (err) {
        console.warn("Failed updating shipment", err)
        alert("Error al actualizar embarque: " + (err as any)?.message || err)
      }
    })()
  }

  // Handler para ver detalles
  const handleViewShipment = (shipment: any) => {
    // Enriquecer el objeto de shipment con recepciones y datos derivados para asegurar que el modal tenga valores
    const receptionIds: string[] = shipment.receptionIds || []
    const embeddedReceptions: any[] = Array.isArray(shipment.receptions) && shipment.receptions.length > 0
      ? shipment.receptions
      : (fruitReceptions || []).filter((r) => receptionIds.includes(r.id))

    const totalBoxesFromReceptions = embeddedReceptions.reduce((s, r) => s + Number(r.boxes || 0), 0)
    const totalWeightFromReceptions = embeddedReceptions.reduce((s, r) => {
      if (typeof r.totalWeight === 'number') return s + r.totalWeight
      if (typeof r.boxes === 'number' && typeof r.weightPerBox === 'number') return s + r.boxes * r.weightPerBox
      return s
    }, 0)

    const enriched: any = {
      ...shipment,
      receptions: embeddedReceptions,
      totalBoxes: typeof shipment.totalBoxes === 'number' ? shipment.totalBoxes : totalBoxesFromReceptions,
      totalWeight: typeof shipment.totalWeight === 'number' ? shipment.totalWeight : totalWeightFromReceptions,
    }

    setViewShipment(enriched)
    setIsViewDialogOpen(true)
  }

  const handleDeleteShipment = async (shipment: any) => {
    if (shipment.status === "vendida") {
      alert("No se puede eliminar un embarque que ya ha sido vendido")
      return
    }

    if (!confirm(`¿Estás seguro de eliminar el embarque ${shipment.code || shipment.shipmentNumber}? Las recepciones volverán al estado pendiente.`)) {
      return
    }

    try {
      await apiDeleteShipment(shipment.id)
      await mutateShipments()
      await globalMutate("fruit-receptions")
    } catch (err) {
      console.warn("Error deleting shipment:", err)
      alert("Error al eliminar: " + (err as any)?.message || String(err))
    }
  }

  // Perform create now (used after confirming modal)
  const performCreateConfirmed = async () => {
    if (!pendingCreatePayload) return
    try {
      const created: any = await apiCreateShipment(pendingCreatePayload)
      await mutateShipments()
      await globalMutate("fruit-receptions")
      await globalMutate("accounts-receivable")
      await globalMutate("accounts-payable")
      // Reset form
      setSelectedReceptions([])
      setCarrier("")
      setCarrierContact("")
      setInvoiceAmount("")
      setCarrierInvoiceAmount("")
      setShipmentInvoiceFile(null)
      setCarrierInvoiceFile(null)
      setWaybillFile(null)
      setShipmentDate(new Date().toISOString().split("T")[0])
      setNotes("")
      setIsCreateDialogOpen(false)
      console.log("Created shipment", created)
    } catch (err) {
      console.warn("Failed creating shipment", err)
      openShipmentErrorDialog(`Error al crear embarque: ${(err as any)?.message || String(err)}`)
    } finally {
      setPendingCreatePayload(null)
      setIsFilesNotSupportedDialogOpen(false)
    }
  }

  // Perform edit now (used after confirming modal)
  const performEditConfirmed = async () => {
    if (!pendingEditPayload || !pendingEditId) return
    try {
      await apiUpdateShipment(pendingEditId, pendingEditPayload)
      await mutateShipments()
      await globalMutate("fruit-receptions")
      await globalMutate("accounts-receivable")
      await globalMutate("accounts-payable")
      setIsEditDialogOpen(false)
      setEditingShipmentId(null)
    } catch (err) {
      console.warn("Error updating shipment:", err)
      openShipmentErrorDialog(`Error al actualizar embarque: ${(err as any)?.message || String(err)}`)
    } finally {
      setPendingEditPayload(null)
      setPendingEditId(null)
      setIsFilesNotSupportedDialogOpen(false)
    }
  }

  const handleEditShipment = (shipment: any) => {
    setEditingShipmentId(shipment.id)
    
    // Obtener IDs de recepciones actuales del embarque
    const currentReceptionIds = shipment.receptionIds || 
      (Array.isArray(shipment.receptions) ? shipment.receptions.map((r: any) => r.id) : [])
    
    setEditSelectedReceptions(currentReceptionIds)
    setEditCarrier(shipment.carrier || "")
    setEditCarrierContact(shipment.carrierContact || shipment.customer?.name || shipment.client?.name || shipment.customerName || "")
    setEditInvoiceAmount(shipment.invoiceAmount ? String(shipment.invoiceAmount) : "")
    setEditCarrierInvoiceAmount(shipment.carrierInvoiceAmount ? String(shipment.carrierInvoiceAmount) : "")
    setEditShipmentInvoiceFile(null)
    setEditCarrierInvoiceFile(null)
    setEditWaybillFile(null)
    // Load existing file URLs from shipment
    const shipmentInvoiceUrl = shipment.shipmentInvoiceUrl || shipment.invoiceUrl || null
    const carrierInvoiceUrl = shipment.carrierInvoiceUrl || null
    const waybillUrl = shipment.waybillComplementUrl || shipment.waybillUrl || null

    setEditShipmentInvoiceUrl(shipmentInvoiceUrl)
    setEditCarrierInvoiceUrl(carrierInvoiceUrl)
    setEditWaybillUrl(waybillUrl)
    setInitialEditShipmentInvoiceUrl(shipmentInvoiceUrl)
    setInitialEditCarrierInvoiceUrl(carrierInvoiceUrl)
    setInitialEditWaybillUrl(waybillUrl)
    setEditShipmentDate(shipment.date || shipment.shipmentDate || "")
    setEditNotes(shipment.notes || "")
    setIsEditDialogOpen(true)
  }

  const handleToggleEditReception = (receptionId: string) => {
    setEditSelectedReceptions((prev) =>
      prev.includes(receptionId) ? prev.filter((id) => id !== receptionId) : [...prev, receptionId]
    )
  }

  const handleSaveEdit = async () => {
    if (!editingShipmentId) return

    try {
      const payload: any = {
        carrier: editCarrier,
        date: editShipmentDate,
        receptionIds: editSelectedReceptions,
      }
      if (editCarrierContact) payload.driver = editCarrierContact
      if (editNotes) payload.notes = editNotes
      if (editInvoiceAmount) payload.invoiceAmount = Number(editInvoiceAmount)
      if (editCarrierInvoiceAmount) payload.carrierInvoiceAmount = Number(editCarrierInvoiceAmount)

      // Normalize and validate receptionIds
      payload.receptionIds = Array.isArray(payload.receptionIds) ? payload.receptionIds.map(String) : []
      if (!payload.receptionIds || payload.receptionIds.length === 0) {
        alert("Seleccione al menos una recepción antes de actualizar el embarque")
        return
      }

      const shouldClearShipmentInvoice = !!initialEditShipmentInvoiceUrl && !editShipmentInvoiceUrl && !editShipmentInvoiceFile
      const shouldClearCarrierInvoice = !!initialEditCarrierInvoiceUrl && !editCarrierInvoiceUrl && !editCarrierInvoiceFile
      const shouldClearWaybill = !!initialEditWaybillUrl && !editWaybillUrl && !editWaybillFile

      if (editShipmentInvoiceFile || editCarrierInvoiceFile || editWaybillFile || shouldClearShipmentInvoice || shouldClearCarrierInvoice || shouldClearWaybill) {
        // Build FormData and send files
        const form = new FormData()
        payload.receptionIds.forEach((id: string) => form.append('receptionIds', id))
        if (payload.date) form.append('date', payload.date)
        if (payload.carrier) form.append('carrier', payload.carrier)
        if (payload.driver) form.append('driver', payload.driver)
        if (payload.notes) form.append('notes', payload.notes)
        if (editInvoiceAmount) form.append('invoiceAmount', String(editInvoiceAmount))
        if (editCarrierInvoiceAmount) form.append('carrierInvoiceAmount', String(editCarrierInvoiceAmount))
        await appendCompressedDocument(form, 'shipmentInvoiceFile', editShipmentInvoiceFile)
        await appendCompressedDocument(form, 'carrierInvoiceFile', editCarrierInvoiceFile)
        await appendCompressedDocument(form, 'waybillFile', editWaybillFile)
        if (shouldClearShipmentInvoice) form.append('invoiceUrl', '')
        if (shouldClearCarrierInvoice) form.append('carrierInvoiceUrl', '')
        if (shouldClearWaybill) form.append('waybillUrl', '')

        await updateShipmentWithDocuments(editingShipmentId, form)
      } else {
        if (shouldClearShipmentInvoice) payload.invoiceUrl = null
        if (shouldClearCarrierInvoice) payload.carrierInvoiceUrl = null
        if (shouldClearWaybill) payload.waybillUrl = null
        await apiUpdateShipment(editingShipmentId, payload)
      }
      await mutateShipments()
      await globalMutate("fruit-receptions")
      await globalMutate("accounts-receivable")
      await globalMutate("accounts-payable")
      setIsEditDialogOpen(false)
      setEditingShipmentId(null)
    } catch (err) {
      console.error("Error updating shipment:", err)
      alert("Error al actualizar: " + (err as any)?.message || String(err))
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Embarques</CardTitle>
            <CardDescription>Agrupa recepciones de múltiples productores y gestiona ventas</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="producer">Productor (A–Z)</SelectItem>
                <SelectItem value="code">Folio / Código</SelectItem>
                <SelectItem value="date">Fecha</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')} title="Ordenar por productor">
              <ChevronsUpDown className="mr-2 h-4 w-4" />
              {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <ProtectedCreate module="producers">
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Embarque
                  </Button>
                </DialogTrigger>
              </ProtectedCreate>
              <DialogContent 
                className="max-w-[60vw] w-[60vw] max-h-[90vh] h-[90vh] overflow-hidden flex flex-col p-0 gap-0"
              >
                <div className="flex flex-col h-full p-6">
                  <DialogHeader className="shrink-0 space-y-2 pb-4">
                    <DialogTitle className="text-xl">Crear Nuevo Embarque</DialogTitle>
                    <DialogDescription className="text-sm">
                      Selecciona múltiples recepciones de diferentes productores para agrupar en un embarque
                    </DialogDescription>
                  </DialogHeader>

                  {/* Modal: files not supported (confirmation) */}
                  <Dialog open={isFilesNotSupportedDialogOpen} onOpenChange={setIsFilesNotSupportedDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Archivos no soportados en este formulario</DialogTitle>
                        <DialogDescription>
                          El servidor actual no acepta la subida de documentos desde el formulario de Embarques.
                          Si continúas, el embarque se creará/actualizará pero los archivos adjuntos no serán enviados.
                          Si necesitas adjuntar facturas o carta porte, sube los documentos mediante el módulo de documentos o espera a que el backend soporte multipart.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => { setIsFilesNotSupportedDialogOpen(false); setPendingCreatePayload(null); setPendingEditPayload(null); setPendingEditId(null); }}>
                            Cancelar
                          </Button>
                          <Button onClick={() => { if (pendingCreatePayload) performCreateConfirmed(); else performEditConfirmed(); }}>
                            Continuar sin archivos
                          </Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isShipmentErrorDialogOpen} onOpenChange={setIsShipmentErrorDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Error al procesar embarque</DialogTitle>
                        <DialogDescription className="whitespace-pre-line">
                          {shipmentErrorMessage}
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <div className="flex justify-end">
                          <Button onClick={() => setIsShipmentErrorDialogOpen(false)}>Aceptar</Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                <div className="flex-1 overflow-y-auto px-6 pb-4">
                <div className="grid gap-6 py-4">
                  {selectedReceptions.length > 0 && (
                    <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <Package className="h-6 w-6 text-blue-600 mt-1 shrink-0" />
                        <div className="space-y-2 flex-1">
                          <p className="text-base font-semibold text-blue-900">Resumen de Selección</p>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-blue-600 font-medium text-xs">Recepciones</span>
                              <span className="text-2xl font-bold text-blue-900">{selectedReceptions.length}</span>
                            </div>
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-blue-600 font-medium text-xs">Productores</span>
                              <span className="text-2xl font-bold text-blue-900">{producersInvolved}</span>
                            </div>
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-blue-600 font-medium text-xs">Cajas Totales</span>
                              <span className="text-2xl font-bold text-blue-900">
                                {Number(totalBoxes || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Seleccionar Recepciones Pendientes</Label>
                    <div className="rounded-lg border-2 shadow-sm">
                      <div className="max-h-[350px] overflow-y-auto">
                        <Table className="table-fixed">
                          <TableHeader className="sticky top-0 bg-muted z-10">
                            <TableRow className="hover:bg-muted">
                              <TableHead className="w-12 text-center h-12">
                                <Checkbox
                                  checked={selectedReceptions.length === pendingReceptions.length && pendingReceptions.length > 0}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedReceptions(pendingReceptions.map(r => r.id))
                                    } else {
                                      setSelectedReceptions([])
                                    }
                                  }}
                                />
                              </TableHead>
                              <TableHead className="w-24 font-semibold text-sm">Productor</TableHead>
                              <TableHead className="w-24 font-semibold text-sm">Número</TableHead>
                              <TableHead className="w-20 font-semibold text-sm">Folio</TableHead>
                              <TableHead className="w-36 font-semibold text-sm">Producto</TableHead>
                              <TableHead className="w-16 font-semibold text-sm text-right">Cajas</TableHead>
                              <TableHead className="w-20 font-semibold text-sm text-right">Peso/Caja</TableHead>
                              <TableHead className="w-20 font-semibold text-sm text-right">Peso Total</TableHead>
                              <TableHead className="w-24 font-semibold text-sm">Fecha</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingReceptions.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground py-12 text-sm">
                                  No hay recepciones pendientes de embarque
                                </TableCell>
                              </TableRow>
                            ) : (
                              pendingReceptions.map((reception) => {
                                const producer = producers?.find((p) => p.id === reception.producerId)
                                const isSelected = selectedReceptions.includes(reception.id)
                                const receptionNumber = (reception as any).receptionNumber || (reception as any).code || ""
                                const receptionDate = (reception as any).receptionDate || (reception as any).date || reception.createdAt
                                return (
                                  <TableRow 
                                    key={reception.id} 
                                    className={`cursor-pointer transition-colors h-12 ${isSelected ? "bg-blue-100 hover:bg-blue-200" : "hover:bg-muted/50"}`}
                                    onClick={() => handleToggleReception(reception.id)}
                                  >
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggleReception(reception.id)}
                                      />
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">{producer?.name || "-"}</TableCell>
                                    <TableCell className="text-sm font-mono">{receptionNumber || <span className="text-muted-foreground">-</span>}</TableCell>
                                    <TableCell className="text-sm">
                                      {(reception as any).trackingFolio ? (
                                        <span className="font-mono text-xs bg-blue-50 px-1.5 py-0.5 rounded">{(reception as any).trackingFolio}</span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm overflow-hidden">
                                      {(() => {
                                        const product = (reception as any).product || {}
                                        const full = String(product.name || "-")
                                        const sku = String(product.sku || product.code || "").trim()
                                        const presentation = String(product.presentation || "").trim()

                                        // Start with words from the full name
                                        const nameWords = full.split(/\s+/).filter(Boolean)
                                        const previewParts: string[] = []
                                        // take up to two words from name
                                        for (let i = 0; i < Math.min(2, nameWords.length); i++) previewParts.push(nameWords[i])

                                        // fill remaining slots with SKU / presentation / code / id
                                        const fallbacks = [sku, presentation, String(product.variety || ""), String(product.packaging || ""), String(product.code || ""), String(product.id || "")]
                                        for (const f of fallbacks) {
                                          if (previewParts.length >= 2) break
                                          if (!f) continue
                                          // if fallback contains multiple words, take first token only to avoid overflow
                                          const tok = String(f).split(/\s+/).filter(Boolean)[0]
                                          if (tok && !previewParts.includes(tok)) previewParts.push(tok)
                                        }

                                        const previewLine1 = previewParts[0] || "-"
                                        const previewLine2 = previewParts[1] || ""

                                        return (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div className="w-full max-w-36 text-sm leading-4">
                                                  <div className="truncate">{previewLine1}</div>
                                                  <div className="truncate">{previewLine2 || "-"}</div>
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent>{full}</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )
                                      })()}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-sm">
                                      {Number(reception.boxes || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                                    </TableCell>
                                    <TableCell className="text-right text-sm">{reception.weightPerBox ? `${reception.weightPerBox} kg` : "-"}</TableCell>
                                    <TableCell className="text-right font-semibold text-sm">{reception.totalWeight ? `${reception.totalWeight} kg` : "-"}</TableCell>
                                    <TableCell className="whitespace-nowrap text-sm">{formatDate(receptionDate)}</TableCell>
                                  </TableRow>
                                )
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="carrier" className="text-sm font-semibold">
                        Transportista <span className="text-red-500">*</span>
                      </Label>
                      <ComboBox
                        options={(suppliers || []).map((s: any) => ({
                          value: String(s.businessName || s.name || s.id),
                          label: String(s.businessName || s.name || s.id),
                          subtitle: String(s.rfc || ""),
                        }))}
                        value={carrier}
                        onChange={(v) => setCarrier(v)}
                        placeholder="Seleccionar transportista"
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="carrierContact" className="text-sm font-semibold">
                        Cliente
                      </Label>
                      <ComboBox
                        options={(customers || []).map((c) => ({
                          value: String(c.name),
                          label: String(c.name),
                          subtitle: `${c.contactName || "Sin contacto"}${c.phone ? ` • ${c.phone}` : ""}`,
                        }))}
                        value={carrierContact}
                        onChange={(v) => setCarrierContact(v)}
                        placeholder="Seleccionar cliente"
                        emptyMessage="No se encontraron clientes"
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="invoiceAmount" className="text-sm font-semibold">Monto factura embarque</Label>
                      <Input
                        id="invoiceAmount"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={invoiceAmount}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setInvoiceAmount(value)
                          }
                        }}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carrierInvoiceAmount" className="text-sm font-semibold">Monto factura transportista</Label>
                      <Input
                        id="carrierInvoiceAmount"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={carrierInvoiceAmount}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setCarrierInvoiceAmount(value)
                          }
                        }}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Facturas y documentos del viaje</Label>
                    <p className="text-xs text-muted-foreground">
                      Se permiten 2 facturas: embarque (PDF/XML) y transportista (PDF/XML). También se puede adjuntar el complemento carta porte.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3 rounded-lg border p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Truck className="h-4 w-4" />
                          Documentación del transportista
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="carrierInvoiceFile" className="text-xs text-muted-foreground">Factura del transportista (PDF/XML)</Label>
                          <Input
                            id="carrierInvoiceFile"
                            type="file"
                            accept=".pdf,.xml"
                            onChange={(e) => setCarrierInvoiceFile(e.target.files?.[0] || null)}
                            className="h-10 text-sm"
                          />
                          {carrierInvoiceFile && (
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate">{carrierInvoiceFile.name}</span>
                              <Button type="button" size="sm" variant="outline" onClick={() => setCarrierInvoiceFile(null)}>Quitar</Button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="waybillFile" className="text-xs text-muted-foreground">Complemento carta porte (PDF/XML)</Label>
                          <Input
                            id="waybillFile"
                            type="file"
                            accept=".pdf,.xml"
                            onChange={(e) => setWaybillFile(e.target.files?.[0] || null)}
                            className="h-10 text-sm"
                          />
                          {waybillFile && (
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate">{waybillFile.name}</span>
                              <Button type="button" size="sm" variant="outline" onClick={() => setWaybillFile(null)}>Quitar</Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FileText className="h-4 w-4" />
                          Factura del embarque
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Upload className="h-3.5 w-3.5" />
                          PDF/XML
                        </div>
                        <Input
                          id="shipmentInvoiceFile"
                          type="file"
                          accept=".pdf,.xml"
                          onChange={(e) => setShipmentInvoiceFile(e.target.files?.[0] || null)}
                          className="h-10 text-sm"
                        />
                        {shipmentInvoiceFile && (
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate">{shipmentInvoiceFile.name}</span>
                            <Button type="button" size="sm" variant="outline" onClick={() => setShipmentInvoiceFile(null)}>Quitar</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {(hasCreateInvoiceData || hasCreateCarrierInvoiceData) && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-start gap-2">
                        <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="space-y-2 flex-1">
                          <p className="text-sm font-medium text-green-900">Resumen de cuentas automáticas</p>
                          {hasCreateInvoiceData && (
                            <p className="text-sm text-green-700">Se generará cuenta por cobrar al cliente por {formatCurrency(Number(invoiceAmount || 0))}</p>
                          )}
                          {hasCreateCarrierInvoiceData && (
                            <p className="text-sm text-green-700">Se generará cuenta por pagar al transportista por {formatCurrency(Number(carrierInvoiceAmount || 0))}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="shipmentDate" className="text-sm font-semibold">
                      Fecha de Embarque <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="shipmentDate"
                      type="date"
                      value={shipmentDate}
                      onChange={(e) => setShipmentDate(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-semibold">
                      Notas
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Destino, observaciones, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 pt-4 pb-6 px-6 border-t">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="h-10 px-6 text-sm">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateShipment} 
                  disabled={selectedReceptions.length === 0 || !carrier || isCreatingShipment}
                  className="h-10 px-6 text-sm"
                >
                  {isCreatingShipment ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Package className="mr-2 h-4 w-4" />
                  )}
                  {isCreatingShipment ? "Creando embarque..." : `Crear Embarque (${selectedReceptions.length} recepciones)`}
                </Button>
              </DialogFooter>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TablePagination {...paginationProps} />
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner2 />
          </div>
        ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio Seguimiento</TableHead>
                <TableHead>Productores</TableHead>
                <TableHead>Cajas Totales</TableHead>
                    <TableHead>Peso Total</TableHead>
                <TableHead>Transportista</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Embarque</TableHead>
                <TableHead>Llegada</TableHead>
                <TableHead>Precio Venta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedShipments.map((shipment) => {
                const config = statusConfig[(shipment as any).status as ShipmentStatus]
                const receptionIds: string[] = (shipment as any).receptionIds || []
                // Prefer embedded receptions from ship object (same as detail modal)
                const receptions: any[] =
                  Array.isArray((shipment as any).receptions) && (shipment as any).receptions.length > 0
                    ? (shipment as any).receptions
                    : (fruitReceptions || []).filter((r) => receptionIds.includes(r.id))
                const producersList = [...new Set(receptions.map((r) => r.producerId))]
                  .map((id) => producers.find((p) => p.id === id))
                  .filter(Boolean)

                const shipmentNumber = (shipment as any).shipmentNumber || (shipment as any).code || ""
                const shipmentDate = (shipment as any).shipmentDate || (shipment as any).date || (shipment as any).createdAt
                return (
                  <TableRow key={shipment.id}>
                      <TableCell>
                        {(() => {
                          const folios = [...new Set(receptions.map((r) => r.trackingFolio).filter(Boolean))]
                          if (folios.length === 0 && (shipment as any).trackingFolio) {
                            return <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded">{(shipment as any).trackingFolio}</span>
                          }
                          if (folios.length === 0) return <span className="text-muted-foreground text-sm">-</span>
                          if (folios.length === 1) {
                            return <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded">{folios[0]}</span>
                          }
                          return (
                            <div className="text-sm">
                              <span className="font-mono text-xs bg-blue-50 px-1 py-0.5 rounded">{folios[0]}</span>
                              <div className="text-muted-foreground text-xs">+{folios.length - 1} más</div>
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          if (!producersList || producersList.length === 0) return "-"
                          const first = producersList[0]
                          return (
                            <div className="text-sm">
                              <div>{first?.name || (first as any)?.businessName || first?.id}</div>
                              {producersList.length > 1 && (
                                <div className="text-muted-foreground text-xs">+{producersList.length - 1} más</div>
                              )}
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell>{(shipment as any).totalBoxes}</TableCell>
                    <TableCell>
                      {(() => {
                        const sw = parseFloat((shipment as any).totalWeight)
                        if (!isNaN(sw) && sw > 0) return `${sw.toFixed(2)} kg`
                        const computed = receptions.reduce((s, r) => {
                          const tw = parseFloat(r.totalWeight)
                          if (!isNaN(tw) && tw > 0) return s + tw
                          const boxes = parseFloat(r.boxes)
                          const wpb = parseFloat(r.weightPerBox)
                          if (!isNaN(boxes) && !isNaN(wpb)) return s + boxes * wpb
                          return s
                        }, 0)
                        return computed > 0 ? `${computed.toFixed(2)} kg` : "-"
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{(shipment as any).carrier}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(shipment as any).carrierContact || "-"}
                    </TableCell>
                    <TableCell>{shipmentDate ? formatDate(shipmentDate) : "-"}</TableCell>
                    <TableCell>{(shipment as any).arrivalDate ? formatDate((shipment as any).arrivalDate) : "-"}</TableCell>
                    <TableCell>
                      {(shipment as any).salePrice ? (
                        <div>
                          <div className="font-semibold text-green-600">{formatCurrency((shipment as any).salePrice)}/caja</div>
                          <div className="text-sm text-muted-foreground">
                            Total: {formatCurrency((shipment as any).totalSale || 0)}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config?.variant || "default"}>{config?.label || (shipment as any).status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {shipment.status !== "vendida" && (
                          <>
                            <ProtectedUpdate module="producers">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Editar embarque"
                                onClick={() => handleEditShipment(shipment)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </ProtectedUpdate>
                            <ProtectedUpdate module="producers">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Actualizar estado"
                                onClick={() => {
                                  setSelectedShipment(shipment.id)
                                  setUpdateStatus((shipment as any).status)
                                  setSalePrice((shipment as any).salePricePerBox ? String((shipment as any).salePricePerBox) : "")
                                  setSaleDate(new Date().toISOString().split("T")[0])
                                  setInvoiceDate(
                                    (shipment as any).invoiceRegisteredAt
                                      ? new Date((shipment as any).invoiceRegisteredAt).toISOString().split("T")[0]
                                      : new Date().toISOString().split("T")[0],
                                  )
                                  setInvoiceNumber(String((shipment as any).code || ""))
                                  setIsUpdateDialogOpen(true)
                                }}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            </ProtectedUpdate>
                            <ProtectedDelete module="producers">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Eliminar embarque"
                                onClick={() => handleDeleteShipment(shipment)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </ProtectedDelete>
                          </>
                        )}
                        <Button variant="ghost" size="sm" title="Ver detalles" onClick={() => handleViewShipment(shipment)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        )}
        <TablePagination {...paginationProps} />

        {/* Edit Shipment Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-[60vw] w-[60vw] max-h-[90vh] h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
            <div className="flex flex-col h-full p-6">
              <DialogHeader className="shrink-0 space-y-2 pb-4">
                <DialogTitle className="text-xl">Editar Embarque</DialogTitle>
                <DialogDescription className="text-sm">
                  Modifica la información del embarque y las recepciones incluidas
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-4">
                <div className="grid gap-6 py-4">
                  {editSelectedReceptions.length > 0 && (
                    <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <Package className="h-6 w-6 text-blue-600 mt-1 shrink-0" />
                        <div className="space-y-2 flex-1">
                          <p className="text-base font-semibold text-blue-900">Resumen de Selección</p>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-blue-600 font-medium text-xs">Recepciones</span>
                              <span className="text-2xl font-bold text-blue-900">{editSelectedReceptions.length}</span>
                            </div>
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-blue-600 font-medium text-xs">Productores</span>
                              <span className="text-2xl font-bold text-blue-900">
                                {(() => {
                                  const allReceptions = [
                                    ...(fruitReceptions || []).filter((r) => r.shipmentStatus === "pendiente"),
                                    ...(fruitReceptions || []).filter((r) => editSelectedReceptions.includes(r.id))
                                  ]
                                  const selected = allReceptions.filter((r) => editSelectedReceptions.includes(r.id))
                                  return new Set(selected.map((r) => r.producerId)).size
                                })()}
                              </span>
                            </div>
                            <div className="flex flex-col space-y-0.5">
                              <span className="text-blue-600 font-medium text-xs">Cajas Totales</span>
                              <span className="text-2xl font-bold text-blue-900">
                                {(() => {
                                  const allReceptions = [
                                    ...(fruitReceptions || []).filter((r) => r.shipmentStatus === "pendiente"),
                                    ...(fruitReceptions || []).filter((r) => editSelectedReceptions.includes(r.id))
                                  ]
                                  const selected = allReceptions.filter((r) => editSelectedReceptions.includes(r.id))
                                  return selected.reduce((sum, r) => sum + Number(r.boxes || 0), 0)
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Seleccionar Recepciones</Label>
                    <p className="text-sm text-muted-foreground">
                      Puedes agregar recepciones pendientes o mantener/quitar las actuales del embarque
                    </p>
                    <div className="rounded-lg border-2 shadow-sm">
                      <div className="max-h-[300px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted z-10">
                            <TableRow className="hover:bg-muted">
                              <TableHead className="w-16 text-center h-12">
                                <Checkbox
                                  checked={(() => {
                                    const available = [
                                      ...(fruitReceptions || []).filter((r) => r.shipmentStatus === "pendiente"),
                                      ...(fruitReceptions || []).filter((r) => editSelectedReceptions.includes(r.id))
                                    ]
                                    return editSelectedReceptions.length === available.length && available.length > 0
                                  })()}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      const available = [
                                        ...(fruitReceptions || []).filter((r) => r.shipmentStatus === "pendiente"),
                                        ...(fruitReceptions || []).filter((r) => editSelectedReceptions.includes(r.id))
                                      ]
                                      setEditSelectedReceptions(available.map(r => r.id))
                                    } else {
                                      setEditSelectedReceptions([])
                                    }
                                  }}
                                />
                              </TableHead>
                              <TableHead className="font-semibold text-sm">Número</TableHead>
                              <TableHead className="font-semibold text-sm">Folio</TableHead>
                              <TableHead className="font-semibold text-sm">Productor</TableHead>
                              <TableHead className="font-semibold text-sm">Producto</TableHead>
                              <TableHead className="font-semibold text-sm text-right">Cajas</TableHead>
                              <TableHead className="font-semibold text-sm text-right">Peso Total</TableHead>
                              <TableHead className="font-semibold text-sm">Estado</TableHead>
                              <TableHead className="font-semibold text-sm">Fecha</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              // Mostrar recepciones pendientes + las que están en el embarque actual
                              const availableReceptions = [
                                ...(fruitReceptions || []).filter((r) => r.shipmentStatus === "pendiente"),
                                ...(fruitReceptions || []).filter((r) => editSelectedReceptions.includes(r.id))
                              ]
                              // Eliminar duplicados
                              const uniqueReceptions = Array.from(new Map(availableReceptions.map(r => [r.id, r])).values())
                              
                              if (uniqueReceptions.length === 0) {
                                return (
                                  <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-sm">
                                      No hay recepciones disponibles
                                    </TableCell>
                                  </TableRow>
                                )
                              }
                              
                              return uniqueReceptions.map((reception) => {
                                const producer = producers?.find((p) => p.id === reception.producerId)
                                const isSelected = editSelectedReceptions.includes(reception.id)
                                const receptionNumber = (reception as any).receptionNumber || (reception as any).code || ""
                                const receptionDate = (reception as any).receptionDate || (reception as any).date || reception.createdAt
                                const isInCurrentShipment = editSelectedReceptions.includes(reception.id) && reception.shipmentStatus !== "pendiente"
                                
                                return (
                                  <TableRow 
                                    key={reception.id} 
                                    className={`cursor-pointer transition-colors h-12 ${isSelected ? "bg-blue-100 hover:bg-blue-200" : "hover:bg-muted/50"}`}
                                    onClick={() => handleToggleEditReception(reception.id)}
                                  >
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggleEditReception(reception.id)}
                                      />
                                    </TableCell>
                                    <TableCell className="text-sm font-mono">{receptionNumber || <span className="text-muted-foreground">-</span>}</TableCell>
                                    <TableCell className="text-sm">
                                      {(reception as any).trackingFolio ? (
                                        <span className="font-mono text-xs bg-blue-50 px-1.5 py-0.5 rounded">{(reception as any).trackingFolio}</span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">{producer?.name || "-"}</TableCell>
                                    <TableCell className="text-sm">{(reception as any).product?.name || "-"}</TableCell>
                                    <TableCell className="text-right font-semibold text-sm">{reception.boxes}</TableCell>
                                    <TableCell className="text-right font-semibold text-sm">
                                      {reception.totalWeight ? `${reception.totalWeight} kg` : "-"}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {isInCurrentShipment ? (
                                        <Badge variant="secondary" className="text-xs">En este embarque</Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs">Pendiente</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-sm">{formatDate(receptionDate)}</TableCell>
                                  </TableRow>
                                )
                              })
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="editCarrier" className="text-sm font-semibold">
                        Transportista <span className="text-red-500">*</span>
                      </Label>
                      <ComboBox
                        options={(suppliers || []).map((s: any) => ({
                          value: String(s.businessName || s.name || s.id),
                          label: String(s.businessName || s.name || s.id),
                          subtitle: String(s.rfc || ""),
                        }))}
                        value={editCarrier}
                        onChange={(v) => setEditCarrier(v)}
                        placeholder="Seleccionar transportista"
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editCarrierContact" className="text-sm font-semibold">
                        Cliente
                      </Label>
                      <ComboBox
                        options={(customers || []).map((c) => ({
                          value: String(c.name),
                          label: String(c.name),
                          subtitle: `${c.contactName || "Sin contacto"}${c.phone ? ` • ${c.phone}` : ""}`,
                        }))}
                        value={editCarrierContact}
                        onChange={(v) => setEditCarrierContact(v)}
                        placeholder="Seleccionar cliente"
                        emptyMessage="No se encontraron clientes"
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="editInvoiceAmount" className="text-sm font-semibold">Monto factura embarque</Label>
                      <Input
                        id="editInvoiceAmount"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={editInvoiceAmount}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setEditInvoiceAmount(value)
                          }
                        }}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editCarrierInvoiceAmount" className="text-sm font-semibold">Monto factura transportista</Label>
                      <Input
                        id="editCarrierInvoiceAmount"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={editCarrierInvoiceAmount}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setEditCarrierInvoiceAmount(value)
                          }
                        }}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Facturas y documentos del viaje</Label>
                    <p className="text-xs text-muted-foreground">
                      Se permiten 2 facturas: embarque (PDF/XML) y transportista (PDF/XML). También se puede adjuntar el complemento carta porte.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3 rounded-lg border p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Truck className="h-4 w-4" />
                          Documentación del transportista
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editCarrierInvoiceFile" className="text-xs text-muted-foreground">Factura del transportista (PDF/XML)</Label>
                          {editCarrierInvoiceUrl && !editCarrierInvoiceFile ? (
                            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="truncate font-medium">{getStoredFileName(editCarrierInvoiceUrl, 'Factura transportista.pdf')}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button type="button" size="sm" variant="outline" asChild className="h-8 px-3">
                                  <a href={editCarrierInvoiceUrl} target="_blank" rel="noreferrer">Ver</a>
                                </Button>
                                <Button type="button" size="sm" variant="outline" className="h-8 px-3" onClick={() => { setEditCarrierInvoiceUrl(null); setEditCarrierInvoiceFile(null) }}>Quitar</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Input
                                id="editCarrierInvoiceFile"
                                type="file"
                                accept=".pdf,.xml"
                                onChange={(e) => setEditCarrierInvoiceFile(e.target.files?.[0] || null)}
                                className="h-10 text-sm"
                              />
                              {editCarrierInvoiceFile && (
                                <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="truncate font-medium">{editCarrierInvoiceFile.name}</span>
                                  </div>
                                  <Button type="button" size="sm" variant="outline" className="h-8 px-3" onClick={() => setEditCarrierInvoiceFile(null)}>Quitar</Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editWaybillFile" className="text-xs text-muted-foreground">Complemento carta porte (PDF/XML)</Label>
                          {editWaybillUrl && !editWaybillFile ? (
                            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="truncate font-medium">{getStoredFileName(editWaybillUrl, 'Complemento carta porte.pdf')}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button type="button" size="sm" variant="outline" asChild className="h-8 px-3">
                                  <a href={editWaybillUrl} target="_blank" rel="noreferrer">Ver</a>
                                </Button>
                                <Button type="button" size="sm" variant="outline" className="h-8 px-3" onClick={() => { setEditWaybillUrl(null); setEditWaybillFile(null) }}>Quitar</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Input
                                id="editWaybillFile"
                                type="file"
                                accept=".pdf,.xml"
                                onChange={(e) => setEditWaybillFile(e.target.files?.[0] || null)}
                                className="h-10 text-sm"
                              />
                              {editWaybillFile && (
                                <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="truncate font-medium">{editWaybillFile.name}</span>
                                  </div>
                                  <Button type="button" size="sm" variant="outline" className="h-8 px-3" onClick={() => setEditWaybillFile(null)}>Quitar</Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FileText className="h-4 w-4" />
                          Factura del embarque
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Upload className="h-3.5 w-3.5" />
                            PDF/XML
                          </div>
                          {editShipmentInvoiceUrl && !editShipmentInvoiceFile ? (
                            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="truncate font-medium">{getStoredFileName(editShipmentInvoiceUrl, 'Factura embarque.pdf')}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button type="button" size="sm" variant="outline" asChild className="h-8 px-3">
                                  <a href={editShipmentInvoiceUrl} target="_blank" rel="noreferrer">Ver</a>
                                </Button>
                                <Button type="button" size="sm" variant="outline" className="h-8 px-3" onClick={() => { setEditShipmentInvoiceUrl(null); setEditShipmentInvoiceFile(null) }}>Quitar</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Input
                                id="editShipmentInvoiceFile"
                                type="file"
                                accept=".pdf,.xml"
                                onChange={(e) => setEditShipmentInvoiceFile(e.target.files?.[0] || null)}
                                className="h-10 text-sm"
                              />
                              {editShipmentInvoiceFile && (
                                <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="truncate font-medium">{editShipmentInvoiceFile.name}</span>
                                  </div>
                                  <Button type="button" size="sm" variant="outline" className="h-8 px-3" onClick={() => setEditShipmentInvoiceFile(null)}>Quitar</Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {(hasEditInvoiceData || hasEditCarrierInvoiceData) && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-start gap-2">
                        <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="space-y-2 flex-1">
                          <p className="text-sm font-medium text-green-900">Resumen de cuentas automáticas</p>
                          {hasEditInvoiceData && (
                            <p className="text-sm text-green-700">Se generará cuenta por cobrar al cliente por {formatCurrency(Number(editInvoiceAmount || 0))}</p>
                          )}
                          {hasEditCarrierInvoiceData && (
                            <p className="text-sm text-green-700">Se generará cuenta por pagar al transportista por {formatCurrency(Number(editCarrierInvoiceAmount || 0))}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="editShipmentDate" className="text-sm font-semibold">
                      Fecha de Embarque <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="editShipmentDate"
                      type="date"
                      value={editShipmentDate}
                      onChange={(e) => setEditShipmentDate(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editNotes" className="text-sm font-semibold">
                      Notas
                    </Label>
                    <Textarea
                      id="editNotes"
                      placeholder="Destino, observaciones, etc."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 pt-4 pb-6 px-6 border-t">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="h-10 px-6 text-sm">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveEdit} 
                  disabled={editSelectedReceptions.length === 0 || !editCarrier || !editShipmentDate}
                  className="h-10 px-6 text-sm"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Guardar Cambios ({editSelectedReceptions.length} recepciones)
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Update Shipment Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Actualizar Embarque</DialogTitle>
              <DialogDescription>Actualiza el estado y precio de venta del embarque</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="status">Estado *</Label>
                <Select value={updateStatus} onValueChange={(value) => setUpdateStatus(value as ShipmentStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="embarcada">Embarcada</SelectItem>
                    <SelectItem value="en-transito">En Tránsito</SelectItem>
                    <SelectItem value="recibida">Recibida</SelectItem>
                    <SelectItem value="vendida">Vendida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(updateStatus === "recibida" || updateStatus === "vendida") && (
                <div className="space-y-2">
                  <Label htmlFor="arrivalDate">Fecha de Llegada</Label>
                  <Input
                    id="arrivalDate"
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                  />
                </div>
              )}

              {updateStatus === "vendida" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="saleDate">Fecha de Venta *</Label>
                    <Input
                      id="saleDate"
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Factura *</Label>
                    <Input
                      id="invoiceNumber"
                      placeholder="Folio / número de factura"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invoiceDate">Fecha de Emisión de Factura *</Label>
                    <Input
                      id="invoiceDate"
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="font-medium">Vencimiento automático</div>
                    <div className="text-slate-600 mt-1">
                      {selectedShipmentCustomer
                        ? `Cliente: ${selectedShipmentCustomer.name} · Crédito: ${selectedShipmentCustomer.creditDays || 0} días · Vence: ${calculatedDueDate || "-"}`
                        : `Sin cliente asociado en el embarque. Vence: ${calculatedDueDate || "-"}`}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salePrice">Precio de Venta por Caja *</Label>
                    <Input
                      id="salePrice"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={salePrice}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setSalePrice(value)
                        }
                      }}
                    />
                  </div>

                  {salePrice && selectedShipment && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-start gap-2">
                        <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="space-y-2 flex-1">
                          <p className="text-sm font-medium text-green-900">Ajuste de Estados de Cuenta</p>
                          <p className="text-sm text-green-700">
                            Se generarán movimientos A FAVOR de cada productor según sus cajas:
                          </p>
                          {(() => {
                            const shipment = (shipments || []).find((s) => s.id === selectedShipment)
                            if (!shipment) return null
                            const receptions = (fruitReceptions || []).filter((r) => (shipment as any).receptionIds?.includes(r.id))
                            return (
                              <div className="space-y-1 text-xs">
                                {receptions.map((r) => {
                                  const producer = producers?.find((p) => p.id === r.producerId)
                                  const amount = r.boxes * Number(salePrice)
                                  return (
                                    <div key={r.id} className="flex justify-between">
                                      <span>{producer?.name || r.producerId}:</span>
                                      <span className="font-semibold">
                                        {r.boxes} cajas × {formatCurrency(Number(salePrice))} = {formatCurrency(amount)}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="updateNotes">Notas</Label>
                <Textarea
                  id="updateNotes"
                  placeholder="Observaciones sobre la actualización..."
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateShipment}
                disabled={
                  updateStatus === "vendida" &&
                  (!salePrice || !saleDate || !invoiceDate || !invoiceNumber?.trim())
                }
              >
                Actualizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Shipment Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-[60vw] w-[60vw] max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="shrink-0 pb-2 border-b">
              <DialogTitle className="text-2xl font-bold">Detalles del Embarque</DialogTitle>
              <DialogDescription>Información completa del embarque y sus recepciones</DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 py-2">
            {viewShipment && (() => {
              // Prefer shipments.receptions when available (server may embed them), otherwise fall back to global fruitReceptions
              const shipmentReceptions: any[] =
                Array.isArray(viewShipment.receptions) && viewShipment.receptions.length > 0
                  ? viewShipment.receptions
                  : (fruitReceptions || []).filter((r) => (viewShipment.receptionIds || []).includes(r.id))

              // Boxes: prefer shipment.totalBoxes, then sum receptions
              const boxesComputed =
                typeof viewShipment.totalBoxes === "number"
                  ? viewShipment.totalBoxes
                  : shipmentReceptions.reduce((s, r) => s + Number(r.boxes || 0), 0)

              // Weight: prefer server-provided shipment.totalWeight, otherwise sum reception.totalWeight or boxes * weightPerBox
              const totalWeightComputed = shipmentReceptions.reduce((s, r) => {
                const tw = parseFloat(r.totalWeight)
                if (!isNaN(tw) && tw > 0) return s + tw
                const boxes = parseFloat(r.boxes)
                const wpb = parseFloat(r.weightPerBox)
                if (!isNaN(boxes) && !isNaN(wpb)) return s + boxes * wpb
                return s
              }, 0)

              const serverWeight = viewShipment.totalWeight != null ? parseFloat(viewShipment.totalWeight) : NaN
              const weightToShow = (!isNaN(serverWeight) && serverWeight > 0) ? serverWeight : totalWeightComputed
              const weightPerBox = boxesComputed > 0 && weightToShow > 0 ? (weightToShow / boxesComputed).toFixed(2) : "0.00"

              const estado = viewShipment.status ? String(viewShipment.status).toLowerCase() : "-"
              const config = statusConfig[estado as ShipmentStatus] || { label: estado, variant: "default" as const }
              const fecha = viewShipment.shipmentDate ? formatDate(viewShipment.shipmentDate) : formatDate(viewShipment.createdAt || new Date())
              const notas = viewShipment.notes || "Sin notas"

              // Get unique producers involved
              const producersInvolved = [...new Set(shipmentReceptions.map((r) => r.producerId))]
                .map((id) => producers?.find((p) => p.id === id))
                .filter(Boolean)

              return (
                <div className="space-y-6 py-2">
                  {/* Main Info Card */}
                  <Card className="border-2 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Información General</CardTitle>
                          <CardDescription>Datos principales del embarque</CardDescription>
                        </div>
                        <Badge variant={config.variant} className="text-sm px-3 py-1">
                          {config.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Número de Embarque</p>
                          <p className="font-semibold text-base">{viewShipment.code || viewShipment.shipmentNumber || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Fecha de Embarque</p>
                          <p className="font-semibold text-base">{fecha}</p>
                        </div>
                      </div>
                      
                      {viewShipment.arrivalDate && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Fecha de Llegada</p>
                          <p className="font-semibold text-base">{formatDate(viewShipment.arrivalDate)}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Transportista</p>
                          <p className="font-semibold text-base">{viewShipment.carrier || "-"}</p>
                        </div>
                        {viewShipment.carrierContact && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Cliente</p>
                            <p className="font-semibold text-base">{viewShipment.carrierContact}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Documentos y Evidencias</CardTitle>
                      <CardDescription>Archivos adjuntos, fechas de carga y referencias contables</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        {
                          label: "Factura del embarque",
                          url: viewShipment.shipmentInvoiceUrl || viewShipment.documents?.shipmentInvoice?.url,
                          uploadedAt: viewShipment.shipmentInvoiceUploadedAt || viewShipment.documents?.shipmentInvoice?.uploadedAt,
                        },
                        {
                          label: "Factura del transportista",
                          url: viewShipment.carrierInvoiceUrl || viewShipment.documents?.carrierInvoice?.url,
                          uploadedAt: viewShipment.carrierInvoiceUploadedAt || viewShipment.documents?.carrierInvoice?.uploadedAt,
                        },
                        {
                          label: "Complemento carta porte",
                          url: viewShipment.waybillComplementUrl || viewShipment.documents?.waybillComplement?.url,
                          uploadedAt: viewShipment.waybillComplementUploadedAt || viewShipment.documents?.waybillComplement?.uploadedAt,
                        },
                      ].map((doc) => (
                        <div key={doc.label} className="p-3 bg-muted rounded-lg space-y-2">
                          <div>
                            <p className="font-medium">{doc.label}</p>
                            <p className="text-xs text-muted-foreground">
                              Cargado: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString("es-MX") : "Sin fecha"}
                            </p>
                          </div>

                          {doc.url ? (
                            <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="truncate font-medium">{getStoredFileName(doc.url, `${doc.label}.pdf`)}</span>
                              </div>
                              <Button type="button" size="sm" variant="outline" asChild className="h-8 px-3 shrink-0">
                                <a href={doc.url} target="_blank" rel="noreferrer">Ver</a>
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                <span>Sin adjunto</span>
                              </div>
                              <Badge variant="outline">Sin archivo</Badge>
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 border rounded-lg">
                          <p className="text-sm text-muted-foreground">Cuenta por cobrar</p>
                          <p className="font-semibold">
                            {(viewShipment.accountsReceivable?.id || viewShipment.accountsReceivableId || viewShipment.receivableAccountId || "-") as any}
                          </p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <p className="text-sm text-muted-foreground">Cuenta por pagar</p>
                          <p className="font-semibold">
                            {(viewShipment.accountsPayable?.id || viewShipment.accountsPayableId || viewShipment.payableAccountId || "-") as any}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Metrics Card with gradient */}
                  <Card className="border-2 shadow-sm bg-linear-to-br from-blue-50 to-indigo-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        Métricas del Embarque
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-muted-foreground mb-2">Total de Cajas</p>
                          <p className="text-3xl font-bold text-blue-600">{boxesComputed}</p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-muted-foreground mb-2">Peso Total</p>
                          <p className="text-3xl font-bold text-blue-600">{weightToShow ? weightToShow.toFixed(2) : "0"}</p>
                          <p className="text-xs text-muted-foreground mt-1">kg</p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-muted-foreground mb-2">Peso por Caja</p>
                          <p className="text-3xl font-bold text-blue-600">{weightPerBox}</p>
                          <p className="text-xs text-muted-foreground mt-1">kg/caja</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sale Info Card (if sold) */}
                  {viewShipment.status === "vendida" && viewShipment.salePrice && (
                    <Card className="border-2 border-green-200 shadow-sm bg-linear-to-br from-green-50 to-emerald-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          Información de Venta
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                            <p className="text-sm text-muted-foreground mb-2">Precio por Caja</p>
                            <p className="text-3xl font-bold text-green-600">{formatCurrency(viewShipment.salePrice)}</p>
                          </div>
                          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                            <p className="text-sm text-muted-foreground mb-2">Venta Total</p>
                            <p className="text-3xl font-bold text-green-600">
                              {formatCurrency((viewShipment.totalSale || (viewShipment.salePrice * boxesComputed)))}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Producers Involved */}
                  {producersInvolved.length > 0 && (
                    <Card className="border-2 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Productores Involucrados</CardTitle>
                        <CardDescription>{producersInvolved.length} productor(es) en este embarque</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {producersInvolved.map((producer) => {
                            const producerReceptions = shipmentReceptions.filter((r) => r.producerId === producer?.id)
                            const producerBoxes = producerReceptions.reduce((s, r) => s + Number(r.boxes || 0), 0)
                            return (
                              <div key={producer?.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                  <p className="font-semibold">{producer?.name}</p>
                                  <p className="text-sm text-muted-foreground">{producer?.code}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-blue-600">{producerBoxes} cajas</p>
                                  <p className="text-xs text-muted-foreground">{producerReceptions.length} recepción(es)</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Receptions Table */}
                  {shipmentReceptions.length > 0 && (
                    <Card className="border-2 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Recepciones Incluidas</CardTitle>
                        <CardDescription>{shipmentReceptions.length} recepción(es) en este embarque</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Folio</TableHead>
                                <TableHead>Productor</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Cajas</TableHead>
                                <TableHead className="text-right">Peso Total</TableHead>
                                <TableHead>Fecha</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {shipmentReceptions.map((reception) => {
                                const producer = producers?.find((p) => p.id === reception.producerId)
                                const receptionNumber = reception.receptionNumber || reception.code || "-"
                                const receptionDate = reception.receptionDate || reception.date || reception.createdAt
                                const productName = reception.product?.name || reception.productName || "-"
                                return (
                                  <TableRow key={reception.id}>
                                    <TableCell>
                                      {reception.trackingFolio ? (
                                        <span className="font-mono text-xs bg-blue-50 px-2 py-1 rounded">
                                          {reception.trackingFolio}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell>{producer?.name || "-"}</TableCell>
                                    <TableCell>{productName}</TableCell>
                                    <TableCell className="text-right font-semibold">{reception.boxes}</TableCell>
                                    <TableCell className="text-right font-semibold">
                                      {reception.totalWeight ? `${reception.totalWeight} kg` : "-"}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{formatDate(receptionDate)}</TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Notes Section */}
                  {notas && notas !== "Sin notas" && (
                    <Card className="border-2 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Notas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">{notas}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Audit Info */}
                  <Card className="border-2 shadow-sm bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Creado</p>
                          <p className="font-medium">{formatDate(viewShipment.createdAt || new Date())}</p>
                        </div>
                        {viewShipment.updatedAt && (
                          <div>
                            <p className="text-muted-foreground mb-1">Actualizado</p>
                            <p className="font-medium">{formatDate(viewShipment.updatedAt)}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}
            </div>
            <DialogFooter className="shrink-0 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
