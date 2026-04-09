import { zipSync } from 'fflate'

export interface DocumentCompressionOptions {
  compressionLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  minFileSizeKB?: number
  forceZip?: boolean
  allowedExtensions?: string[]
}

export interface DocumentCompressionResult {
  originalFile: File
  file: File
  originalSize: number
  compressedSize: number
  savings: number
  percentage: number
  url: string
  wasCompressed: boolean
}

const DEFAULT_ALLOWED_EXTENSIONS = ['.xml', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.json']
const TEXT_LIKE_EXTENSIONS = ['.xml', '.csv', '.txt', '.json']

const DEFAULT_OPTIONS: DocumentCompressionOptions = {
                                compressionLevel: 9,
  minFileSizeKB: 64,
  forceZip: true,
  allowedExtensions: DEFAULT_ALLOWED_EXTENSIONS,
}

export function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  return idx === -1 ? '' : fileName.slice(idx).toLowerCase()
}

export function isValidDocumentFile(file: File, allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS): boolean {
  return allowedExtensions.includes(getFileExtension(file.name)) && file.size > 0
}

function shouldZipFile(file: File, options: Required<DocumentCompressionOptions>): boolean {
  if (options.forceZip) return true
  const extension = getFileExtension(file.name)
  const isTextLike = TEXT_LIKE_EXTENSIONS.includes(extension)
  if (!isTextLike) return false
  return file.size / 1024 >= options.minFileSizeKB
}

function baseName(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  return idx === -1 ? fileName : fileName.slice(0, idx)
}

export async function compressDocument(
  file: File,
  options: DocumentCompressionOptions = {}
): Promise<DocumentCompressionResult> {
  const merged = { ...DEFAULT_OPTIONS, ...options } as Required<DocumentCompressionOptions>

  if (!isValidDocumentFile(file, merged.allowedExtensions)) {
    throw new Error('El archivo no es un documento permitido')
  }

  const originalSize = file.size
  const needsZip = shouldZipFile(file, merged)

  if (!needsZip) {
    return {
      originalFile: file,
      file,
      originalSize,
      compressedSize: originalSize,
      savings: 0,
      percentage: 0,
      url: URL.createObjectURL(file),
      wasCompressed: false,
    }
  }

  const arrayBuffer = await file.arrayBuffer()
  const zippedBytes = zipSync(
    {
      [file.name]: new Uint8Array(arrayBuffer),
    },
    {
      level: merged.compressionLevel,
    }
  )

  const zipBlob = new Blob([zippedBytes as unknown as ArrayBuffer], { type: 'application/zip' })
  const zipFile = new File([zipBlob], `${baseName(file.name)}.zip`, {
    type: 'application/zip',
    lastModified: Date.now(),
  })

  const compressedSize = zipFile.size
  const savings = Math.max(originalSize - compressedSize, 0)
  const percentage = originalSize > 0 ? Math.round((savings / originalSize) * 100) : 0

  return {
    originalFile: file,
    file: zipFile,
    originalSize,
    compressedSize,
    savings,
    percentage,
    url: URL.createObjectURL(zipFile),
    wasCompressed: true,
  }
}

export async function compressMultipleDocuments(
  files: File[],
  options: DocumentCompressionOptions = {}
): Promise<DocumentCompressionResult[]> {
  const validFiles = files.filter((file) => isValidDocumentFile(file, options.allowedExtensions || DEFAULT_ALLOWED_EXTENSIONS))

  if (validFiles.length === 0) {
    throw new Error('No hay documentos validos para procesar')
  }

  return Promise.all(validFiles.map((file) => compressDocument(file, options)))
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB']
  const index = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Math.round((bytes / Math.pow(1024, index)) * 100) / 100} ${units[index]}`
}
