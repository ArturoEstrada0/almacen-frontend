"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText, Receipt } from "lucide-react"

export type PrintFormat = "carta" | "ticket"

interface PrintFormatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrint: (format: PrintFormat) => void
  title?: string
  description?: string
}

export function PrintFormatDialog({
  open,
  onOpenChange,
  onPrint,
  title = "Seleccionar formato de impresión",
  description = "Elige el formato en el que deseas imprimir",
}: PrintFormatDialogProps) {
  const handlePrint = (format: PrintFormat) => {
    onOpenChange(false)
    onPrint(format)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-3">
          <Button 
            onClick={() => handlePrint("carta")}
            className="h-16 flex items-center justify-start gap-4 px-6"
            variant="outline"
          >
            <FileText className="h-6 w-6" />
            <div className="text-left">
              <div className="font-semibold">Carta</div>
              <div className="text-xs text-muted-foreground">Formato completo (8.5" x 11")</div>
            </div>
          </Button>
          <Button 
            onClick={() => handlePrint("ticket")}
            className="h-16 flex items-center justify-start gap-4 px-6"
            variant="outline"
          >
            <Receipt className="h-6 w-6" />
            <div className="text-left">
              <div className="font-semibold">Ticket</div>
              <div className="text-xs text-muted-foreground">Formato compacto (80mm)</div>
            </div>
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Utility function to open print window with formatted HTML
export function openPrintWindow(html: string, format: PrintFormat) {
  const w = window.open("", "_blank")
  if (!w) {
    alert("No se pudo abrir la ventana de impresión (popup bloqueado)")
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => {
    try {
      w.print()
      if (format === "ticket") w.close()
    } catch (err) {
      console.error("Error al imprimir:", err)
    }
  }, 300)
}

// Base styles for print documents
export function getPrintStyles(format: PrintFormat) {
  return `
    body {
      font-family: Arial, Helvetica, sans-serif;
      padding: ${format === "ticket" ? "5px" : "20px"};
      margin: 0;
      font-size: ${format === "ticket" ? "12px" : "14px"};
    }
    .container {
      max-width: ${format === "ticket" ? "280px" : "800px"};
      margin: 0 auto;
    }
    h1 {
      font-size: ${format === "ticket" ? "16px" : "24px"};
      margin: 0 0 10px 0;
      text-align: ${format === "ticket" ? "center" : "left"};
    }
    h2 {
      font-size: ${format === "ticket" ? "14px" : "18px"};
      margin: 15px 0 10px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin: ${format === "ticket" ? "4px 0" : "8px 0"};
      padding: ${format === "ticket" ? "2px 0" : "4px 0"};
      border-bottom: 1px dotted #ddd;
    }
    .row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: bold;
      color: #333;
    }
    .value {
      text-align: right;
    }
    .divider {
      border-top: 1px solid #333;
      margin: ${format === "ticket" ? "8px 0" : "15px 0"};
    }
    .total-row {
      font-weight: bold;
      font-size: ${format === "ticket" ? "14px" : "16px"};
      background: #f5f5f5;
      padding: 8px;
      margin-top: 10px;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      color: #666;
      font-size: ${format === "ticket" ? "10px" : "12px"};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: ${format === "ticket" ? "4px" : "8px"};
      text-align: left;
      font-size: ${format === "ticket" ? "10px" : "12px"};
    }
    th {
      background: #f5f5f5;
      font-weight: bold;
    }
    @media print {
      body { margin: 0; }
      @page {
        size: ${format === "ticket" ? "80mm auto" : "letter"};
        margin: ${format === "ticket" ? "5mm" : "15mm"};
      }
    }
  `
}
