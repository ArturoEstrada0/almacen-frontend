"use client"

import { FileText, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PayableDocument {
  label: string
  url: string
}

interface PayableDocumentsListProps {
  documents: PayableDocument[]
}

export function PayableDocumentsList({ documents }: PayableDocumentsListProps) {
  if (!documents.length) return null

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Facturas / Documentos del Embarque</p>
      <div className="flex w-full justify-end gap-2 overflow-x-auto pb-1">
        {documents.map((doc, index) => (
          <Button key={`${doc.url}-${index}`} asChild variant="outline" size="sm" className="h-9 shrink-0 gap-2 px-3">
            <a href={doc.url} target="_blank" rel="noreferrer" title={doc.label}>
              <FileText className="h-4 w-4" />
              <span className="max-w-[140px] truncate">{doc.label}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ))}
      </div>
    </div>
  )
}
