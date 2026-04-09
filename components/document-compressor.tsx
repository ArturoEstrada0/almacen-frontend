'use client'

import { useMemo, useRef } from 'react'
import { useDocumentCompressor } from '@/hooks/useDocumentCompressor'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, CheckCircle2, Download, FileArchive, UploadCloud, X } from 'lucide-react'
import clsx from 'clsx'
import { formatFileSize, type DocumentCompressionOptions, type DocumentCompressionResult } from '@/lib/document-compression'

export interface DocumentCompressorProps {
  buttonLabel?: string
  className?: string
  multiple?: boolean
  showCompressionInfo?: boolean
  showSelectedFile?: boolean
  options?: DocumentCompressionOptions
  accept?: string
  onCompressionComplete?: (file: File, result: DocumentCompressionResult) => void
  onError?: (error: Error) => void
}

const DEFAULT_ACCEPT = '.xml,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json'

function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function DocumentCompressor({
  buttonLabel = 'Seleccionar documento',
  className = '',
  multiple = false,
  showCompressionInfo = true,
  showSelectedFile = true,
  options,
  accept = DEFAULT_ACCEPT,
  onCompressionComplete,
  onError,
}: DocumentCompressorProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const { compress, compressMultiple, isCompressing, error, result, results, reset } = useDocumentCompressor({
    onError,
    onSuccess: (compressionResult) => {
      if (Array.isArray(compressionResult)) {
        compressionResult.forEach((item) => onCompressionComplete?.(item.file, item))
      } else {
        onCompressionComplete?.(compressionResult.file, compressionResult)
      }
    },
  })

  const selectedResults = useMemo(() => (results.length > 0 ? results : result ? [result] : []), [result, results])

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || [])
    if (files.length === 0) return

    if (files.length === 1) {
      await compress(files[0], options)
    } else if (multiple) {
      await compressMultiple(files, options)
    } else {
      await compress(files[0], options)
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={clsx('w-full space-y-4 rounded-xl border bg-background p-4', className)}>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-4 py-8 text-center transition-colors hover:border-primary/60">
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={handleChange} />

        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          {error ? <AlertCircle className="h-7 w-7" /> : result ? <CheckCircle2 className="h-7 w-7" /> : <UploadCloud className="h-7 w-7" />}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">{isCompressing ? 'Comprimiendo archivos...' : buttonLabel}</p>
          <p className="text-xs text-muted-foreground">Tipos permitidos: XML, PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, JSON</p>
        </div>
      </label>

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      {showSelectedFile && selectedResults.length > 0 ? (
        <div className="space-y-2">
          {selectedResults.map((item) => (
            <div key={`${item.file.name}-${item.originalSize}`} className="flex items-center gap-3 rounded-lg border p-3">
              <FileArchive className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(item.originalSize)} → {formatFileSize(item.compressedSize)}</p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => triggerDownload(item.url, item.file.name)}
                aria-label={`Descargar ${item.file.name}`}
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={reset}
                aria-label="Limpiar selección"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {showCompressionInfo && result ? (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between text-sm">
            <span>Original</span>
            <span>{formatFileSize(result.originalSize)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Salida</span>
            <span>{formatFileSize(result.compressedSize)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Estado</span>
            <span>{result.wasCompressed ? `Comprimido ${result.percentage}%` : 'Sin compresión'}</span>
          </div>
          {isCompressing ? <Progress value={40} className="h-2" /> : null}
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => inputRef.current?.click()} disabled={isCompressing}>
          {isCompressing ? 'Procesando...' : 'Seleccionar archivos'}
        </Button>
      </div>
    </div>
  )
}

export default DocumentCompressor
