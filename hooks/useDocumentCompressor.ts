'use client'

import { useCallback, useState } from 'react'
import {
  compressDocument,
  compressMultipleDocuments,
  type DocumentCompressionOptions,
  type DocumentCompressionResult,
} from '@/lib/document-compression'

export interface UseDocumentCompressorOptions {
  onCompressionStart?: () => void
  onCompressionEnd?: () => void
  onSuccess?: (result: DocumentCompressionResult | DocumentCompressionResult[]) => void
  onError?: (error: Error) => void
}

export interface UseDocumentCompressorReturn {
  isCompressing: boolean
  error: Error | null
  result: DocumentCompressionResult | null
  results: DocumentCompressionResult[]
  compress: (file: File, options?: DocumentCompressionOptions) => Promise<DocumentCompressionResult | null>
  compressMultiple: (files: File[], options?: DocumentCompressionOptions) => Promise<DocumentCompressionResult[] | null>
  reset: () => void
}

export function useDocumentCompressor(options: UseDocumentCompressorOptions = {}): UseDocumentCompressorReturn {
  const { onCompressionStart, onCompressionEnd, onSuccess, onError } = options

  const [isCompressing, setIsCompressing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<DocumentCompressionResult | null>(null)
  const [results, setResults] = useState<DocumentCompressionResult[]>([])

  const compress = useCallback(
    async (file: File, compressionOptions?: DocumentCompressionOptions) => {
      try {
        setIsCompressing(true)
        setError(null)
        onCompressionStart?.()

        const compressed = await compressDocument(file, compressionOptions)
        setResult(compressed)
        setResults([compressed])
        onSuccess?.(compressed)
        return compressed
      } catch (err) {
        const parsed = err instanceof Error ? err : new Error('Error al procesar documento')
        setError(parsed)
        onError?.(parsed)
        return null
      } finally {
        setIsCompressing(false)
        onCompressionEnd?.()
      }
    },
    [onCompressionEnd, onCompressionStart, onError, onSuccess]
  )

  const compressMultiple = useCallback(
    async (files: File[], compressionOptions?: DocumentCompressionOptions) => {
      try {
        setIsCompressing(true)
        setError(null)
        onCompressionStart?.()

        const compressed = await compressMultipleDocuments(files, compressionOptions)
        setResults(compressed)
        setResult(compressed[0] || null)
        onSuccess?.(compressed)
        return compressed
      } catch (err) {
        const parsed = err instanceof Error ? err : new Error('Error al procesar documentos')
        setError(parsed)
        onError?.(parsed)
        return null
      } finally {
        setIsCompressing(false)
        onCompressionEnd?.()
      }
    },
    [onCompressionEnd, onCompressionStart, onError, onSuccess]
  )

  const reset = useCallback(() => {
    setResult(null)
    setResults([])
    setError(null)
  }, [])

  return {
    isCompressing,
    error,
    result,
    results,
    compress,
    compressMultiple,
    reset,
  }
}
