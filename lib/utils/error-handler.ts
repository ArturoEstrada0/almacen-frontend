/**
 * Utilidades para manejo de errores en el frontend
 */

export interface ApiError {
  statusCode: number
  message: string
  errors?: any[]
  timestamp?: string
  path?: string
  technicalDetails?: string
}

/**
 * Extrae un mensaje de error amigable desde diferentes tipos de respuestas de error
 */
export function extractErrorMessage(error: any): string {
  // Si es null o undefined
  if (!error) {
    return 'Ocurrió un error inesperado. Por favor, intente nuevamente.'
  }

  // Si ya es un string, devolverlo
  if (typeof error === 'string') {
    return error
  }

  // Si tiene la estructura de ApiError del backend
  if (error.message && typeof error.message === 'string') {
    return error.message
  }

  // Si es un Error de JavaScript
  if (error instanceof Error) {
    // Limpiar mensajes técnicos comunes
    const message = error.message
    
    // Extraer mensaje del backend si viene en formato "Request failed..."
    const backendMatch = message.match(/Request failed \d+ .* - (.+) \(url:/i)
    if (backendMatch && backendMatch[1]) {
      return backendMatch[1].trim()
    }
    
    // Si el mensaje incluye detalles técnicos, intentar limpiarlos
    if (message.includes('Request failed')) {
      return 'Error al comunicarse con el servidor. Por favor, intente nuevamente.'
    }
    
    return message
  }

  // Si tiene una respuesta de fetch
  if (error.response) {
    return extractErrorMessage(error.response)
  }

  // Si tiene data (estructura común de axios/fetch)
  if (error.data) {
    return extractErrorMessage(error.data)
  }

  // Fallback genérico
  return 'Ocurrió un error inesperado. Por favor, intente nuevamente.'
}

/**
 * Determina si un error es de tipo específico para mostrar UI diferente
 */
export function getErrorType(error: any): 'network' | 'auth' | 'validation' | 'conflict' | 'notfound' | 'server' | 'unknown' {
  const statusCode = error?.statusCode || error?.status || 0
  
  if (statusCode === 0 || statusCode === 503 || statusCode === 504) {
    return 'network'
  }
  
  if (statusCode === 401 || statusCode === 403) {
    return 'auth'
  }
  
  if (statusCode === 400 || statusCode === 422) {
    return 'validation'
  }
  
  if (statusCode === 409) {
    return 'conflict'
  }
  
  if (statusCode === 404) {
    return 'notfound'
  }
  
  if (statusCode >= 500) {
    return 'server'
  }
  
  return 'unknown'
}

/**
 * Formatea errores de validación en una lista legible
 */
export function formatValidationErrors(errors: any[]): string[] {
  if (!Array.isArray(errors)) {
    return []
  }
  
  return errors.map(err => {
    if (typeof err === 'string') {
      return err
    }
    
    if (err.constraints) {
      return Object.values(err.constraints).join(', ')
    }
    
    if (err.message) {
      return err.message
    }
    
    return 'Error de validación'
  })
}

/**
 * Crea un objeto de error consistente para el frontend
 */
export function createErrorResponse(error: any): { 
  success: false
  error: string
  errorType: ReturnType<typeof getErrorType>
  validationErrors?: string[]
} {
  const message = extractErrorMessage(error)
  const errorType = getErrorType(error)
  const validationErrors = error?.errors ? formatValidationErrors(error.errors) : undefined
  
  return {
    success: false,
    error: message,
    errorType,
    validationErrors,
  }
}

/**
 * Wrapper para llamadas a API que maneja errores de forma consistente
 */
export async function apiCall<T>(
  apiFunction: () => Promise<T>,
  options?: {
    onError?: (error: any) => void
    defaultErrorMessage?: string
  }
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await apiFunction()
    return { data, error: null }
  } catch (error) {
    const errorMessage = options?.defaultErrorMessage || extractErrorMessage(error)
    
    if (options?.onError) {
      options.onError(error)
    }
    
    return { data: null, error: errorMessage }
  }
}

/**
 * Determina si se debe reintentar una operación basándose en el tipo de error
 */
export function shouldRetry(error: any, attemptNumber: number, maxAttempts = 3): boolean {
  if (attemptNumber >= maxAttempts) {
    return false
  }
  
  const errorType = getErrorType(error)
  
  // Solo reintentar errores de red o servidor
  return errorType === 'network' || errorType === 'server'
}

/**
 * Mensajes de error amigables según el contexto de la operación
 */
export const ERROR_MESSAGES = {
  create: {
    success: 'Creado exitosamente',
    error: 'No se pudo crear el registro. Por favor, intente nuevamente.',
  },
  update: {
    success: 'Actualizado exitosamente',
    error: 'No se pudo actualizar el registro. Por favor, intente nuevamente.',
  },
  delete: {
    success: 'Eliminado exitosamente',
    error: 'No se pudo eliminar el registro. Por favor, intente nuevamente.',
  },
  fetch: {
    error: 'No se pudieron cargar los datos. Por favor, recargue la página.',
  },
  network: {
    error: 'No se pudo conectar con el servidor. Verifique su conexión a internet.',
  },
  auth: {
    error: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
  },
}
