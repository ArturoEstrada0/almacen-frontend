"use client"

import { ChangeEvent, RefObject } from "react"
import { Eye, ReceiptText, Trash2, Upload, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

export type PaymentReferenceOption = {
  value: string
  label: string
}

export type PaymentHistoryItem = {
  id: string
  paymentDate: string
  amount: string
  reference?: string
  notes?: string
  invoiceUrl?: string | null
  helperText?: string
}

export type SelectedPaymentDocument = {
  invoiceNumber: string
  invoiceDateText: string
  dueDateText: string
  statusLabel: string
  statusVariant: "default" | "secondary" | "destructive" | "outline"
  originalAmountText: string
  balanceAmountText: string
  paidAmountText: string
  recordsCount: number
}

type PaymentManagementCardProps = {
  description?: string
  emptySelectionMessage?: string
  selectedDocument: SelectedPaymentDocument | null
  isDocumentPaid: boolean
  paymentDate: string
  amount: number
  reference: string
  notes: string
  referenceOptions: PaymentReferenceOption[]
  onPaymentDateChange: (value: string) => void
  onAmountChange: (value: number) => void
  onReferenceChange: (value: string) => void
  onNotesChange: (value: string) => void
  onRegisterPayment: () => void
  isSaving: boolean
  registerDisabled: boolean
  historyItems: PaymentHistoryItem[]
  showInvoiceColumn?: boolean
  historyEmptyMessage?: string
  showAttachmentControls?: boolean
  attachmentInputRef?: RefObject<HTMLInputElement | null>
  onAttachmentFileChange?: (event: ChangeEvent<HTMLInputElement>) => void
  onAttachClick?: () => void
  attachmentLabel?: string
  hasAttachedFile?: boolean
  onViewAttached?: () => void
  onRemoveAttached?: () => void
}

export default function PaymentManagementCard({
  description = "Registra múltiples abonos para la factura seleccionada.",
  emptySelectionMessage = "Selecciona una factura para revisar su historial y capturar un nuevo abono.",
  selectedDocument,
  isDocumentPaid,
  paymentDate,
  amount,
  reference,
  notes,
  referenceOptions,
  onPaymentDateChange,
  onAmountChange,
  onReferenceChange,
  onNotesChange,
  onRegisterPayment,
  isSaving,
  registerDisabled,
  historyItems,
  showInvoiceColumn = true,
  historyEmptyMessage = "Aún no hay abonos registrados para esta factura.",
  showAttachmentControls = false,
  attachmentInputRef,
  onAttachmentFileChange,
  onAttachClick,
  attachmentLabel = "Adjuntar factura",
  hasAttachedFile = false,
  onViewAttached,
  onRemoveAttached,
}: PaymentManagementCardProps) {
  const hasManyPayments = historyItems.length > 2

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de abonos</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedDocument ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            {emptySelectionMessage}
          </div>
        ) : (
          <>
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{selectedDocument.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    Emitida el {selectedDocument.invoiceDateText} · Vence el {selectedDocument.dueDateText}
                  </p>
                </div>
                <Badge variant={selectedDocument.statusVariant}>{selectedDocument.statusLabel}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Original</p>
                  <p className="font-semibold">{selectedDocument.originalAmountText}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Saldo</p>
                  <p className="font-semibold">{selectedDocument.balanceAmountText}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Abonos</p>
                  <p className="font-semibold">{selectedDocument.paidAmountText}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Registros</p>
                  <p className="font-semibold">{selectedDocument.recordsCount}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {isDocumentPaid ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Esta factura ya está pagada. No se pueden registrar nuevos abonos.
                </div>
              ) : (
                <div className="space-y-4 rounded-md border p-4">
                  <div>
                    <h3 className="text-sm font-semibold">Nuevo abono</h3>
                    <p className="text-xs text-muted-foreground">
                      El saldo se recalcula automáticamente después de guardar.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentDate">Fecha</Label>
                      <Input
                        id="paymentDate"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => onPaymentDateChange(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentAmount">Monto</Label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount || ""}
                        onChange={(e) => onAmountChange(Number(e.target.value || 0))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Referencia</Label>
                      <Select value={reference} onValueChange={onReferenceChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una referencia" />
                        </SelectTrigger>
                        <SelectContent>
                          {referenceOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentNotes">Notas</Label>
                      <Textarea
                        id="paymentNotes"
                        value={notes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        placeholder="Referencia bancaria, folio del cheque, observaciones, etc."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {showAttachmentControls ? (
                      <Input
                        ref={attachmentInputRef}
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={onAttachmentFileChange}
                      />
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button className="gap-2" onClick={onRegisterPayment} disabled={registerDisabled}>
                        <Wallet className="h-4 w-4" />
                        {isSaving ? "Guardando..." : "Registrar abono"}
                      </Button>

                      {showAttachmentControls ? (
                        <>
                          <Button type="button" variant="outline" className="max-w-60 gap-2" onClick={onAttachClick}>
                            <Upload className="h-4 w-4" />
                            <span className="truncate">{attachmentLabel}</span>
                          </Button>
                          {hasAttachedFile ? (
                            <>
                              <Button type="button" variant="default" className="gap-2" onClick={onViewAttached}>
                                <Eye className="h-4 w-4" />
                                Ver
                              </Button>
                              <Button type="button" variant="destructive" className="gap-2" onClick={onRemoveAttached}>
                                <Trash2 className="h-4 w-4" />
                                Borrar
                              </Button>
                            </>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Historial de abonos</h3>
                </div>

                {historyItems.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    {historyEmptyMessage}
                  </div>
                ) : (
                  <div className={hasManyPayments ? "max-h-64 overflow-y-auto overflow-x-auto rounded-md border" : "rounded-md border"}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Referencia</TableHead>
                          {showInvoiceColumn ? <TableHead>Factura</TableHead> : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyItems.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{payment.paymentDate}</TableCell>
                            <TableCell>{payment.amount}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="text-sm font-medium">{payment.reference || "-"}</p>
                                {payment.helperText ? <p className="text-xs text-muted-foreground">{payment.helperText}</p> : null}
                                {payment.notes ? <p className="text-xs text-muted-foreground">{payment.notes}</p> : null}
                              </div>
                            </TableCell>
                            {showInvoiceColumn ? (
                              <TableCell>
                                {payment.invoiceUrl ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 gap-1 px-2"
                                    onClick={() => window.open(payment.invoiceUrl as string, "_blank", "noopener,noreferrer")}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Ver
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Sin factura</span>
                                )}
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
