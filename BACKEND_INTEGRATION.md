# Guía de Integración Backend

Este documento explica cómo integrar el backend con los componentes del frontend.

## Estructura de Integración

### 1. Server Actions (lib/actions/)

Las Server Actions manejan todas las operaciones de base de datos:

\`\`\`typescript
// Ejemplo: lib/actions/products.ts
export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
  
  return { data, error: error?.message || null }
}
\`\`\`

### 2. Custom Hooks (lib/hooks/)

Los hooks usan SWR para cache y revalidación automática:

\`\`\`typescript
// Ejemplo: lib/hooks/use-products.ts
export function useProducts() {
  const { data, error, isLoading, mutate } = useSWR('products', async () => {
    const result = await getProducts()
    if (result.error) throw new Error(result.error)
    return result.data
  })

  return { products: data || [], isLoading, isError: error, mutate }
}
\`\`\`

### 3. Componentes (app/*/page.tsx)

Los componentes usan los hooks para obtener datos:

\`\`\`typescript
export default function ProductsPage() {
  const { products, isLoading, mutate } = useProducts()
  
  // Loading state
  if (isLoading) return <LoadingSpinner />
  
  // Render products
  return <ProductsList products={products} />
}
\`\`\`

## Patrón de Implementación

### Paso 1: Crear Server Action

\`\`\`typescript
// lib/actions/example.ts
'use server'

import { supabase, handleSupabaseError } from '@/lib/db/supabase'
import { revalidatePath } from 'next/cache'

export async function createExample(data: any) {
  try {
    const { data: result, error } = await supabase
      .from('table_name')
      .insert([data])
      .select()
      .single()

    if (error) handleSupabaseError(error)
    
    revalidatePath('/path') // Revalidate cache
    return { data: result, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}
\`\`\`

### Paso 2: Crear Custom Hook

\`\`\`typescript
// lib/hooks/use-example.ts
'use client'

import useSWR from 'swr'
import { getExamples } from '@/lib/actions/example'

export function useExamples() {
  const { data, error, isLoading, mutate } = useSWR('examples', async () => {
    const result = await getExamples()
    if (result.error) throw new Error(result.error)
    return result.data
  })

  return {
    examples: data || [],
    isLoading,
    isError: error,
    mutate
  }
}
\`\`\`

### Paso 3: Usar en Componente

\`\`\`typescript
'use client'

import { useExamples } from '@/lib/hooks/use-example'
import { createExample } from '@/lib/actions/example'
import { toast } from '@/lib/utils/toast'

export default function ExamplePage() {
  const { examples, isLoading, mutate } = useExamples()

  const handleCreate = async (data: any) => {
    const loadingToast = toast.loading('Creando...')
    
    try {
      const result = await createExample(data)
      
      if (result.error) {
        toast.error('Error', result.error)
      } else {
        toast.success('Creado correctamente')
        mutate() // Revalidate data
      }
    } catch (error) {
      toast.error('Error inesperado')
    }
  }

  if (isLoading) return <LoadingState />

  return (
    <div>
      {examples.map(example => (
        <ExampleCard key={example.id} data={example} />
      ))}
    </div>
  )
}
\`\`\`

## Manejo de Errores

### En Server Actions

\`\`\`typescript
try {
  const { data, error } = await supabase.from('table').select()
  if (error) handleSupabaseError(error)
  return { data, error: null }
} catch (error: any) {
  return { data: null, error: error.message }
}
\`\`\`

### En Componentes

\`\`\`typescript
const result = await createSomething(data)

if (result.error) {
  toast.error('Error', result.error)
  return
}

toast.success('Operación exitosa')
mutate() // Revalidate cache
\`\`\`

## Optimistic Updates

Para mejor UX, usa optimistic updates con SWR:

\`\`\`typescript
const { mutate } = useExamples()

const handleUpdate = async (id: string, newData: any) => {
  // Optimistic update
  mutate(
    (current) => current?.map(item => 
      item.id === id ? { ...item, ...newData } : item
    ),
    false // Don't revalidate yet
  )

  // Actual update
  const result = await updateExample(id, newData)
  
  if (result.error) {
    toast.error('Error', result.error)
    mutate() // Revert on error
  } else {
    toast.success('Actualizado')
    mutate() // Revalidate with server data
  }
}
\`\`\`

## Notificaciones

Usa el sistema de toast para feedback:

\`\`\`typescript
import { toast } from '@/lib/utils/toast'

// Success
toast.success('Operación exitosa')

// Error
toast.error('Error', 'Descripción del error')

// Loading
const loadingToast = toast.loading('Procesando...')
// ... operation
toast.dismiss(loadingToast)

// Promise
toast.promise(
  someAsyncOperation(),
  {
    loading: 'Procesando...',
    success: 'Completado',
    error: 'Error'
  }
)
\`\`\`

## Estados de Carga

Siempre muestra estados de carga apropiados:

\`\`\`typescript
if (isLoading) {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}

if (isError) {
  return (
    <div className="text-center p-8">
      <p className="text-destructive">Error al cargar datos</p>
    </div>
  )
}
\`\`\`

## Revalidación de Cache

Usa \`revalidatePath\` en Server Actions para invalidar cache:

\`\`\`typescript
import { revalidatePath } from 'next/cache'

export async function updateProduct(id: string, data: any) {
  // ... update logic
  
  revalidatePath('/products') // Revalidate products page
  revalidatePath('/inventory') // Revalidate inventory if needed
  
  return { data, error: null }
}
\`\`\`

## Próximos Pasos

1. Implementar los mismos patrones en:
   - Inventario
   - Proveedores
   - Órdenes de Compra
   - Productores

2. Agregar validación con Zod en formularios

3. Implementar paginación para listas grandes

4. Agregar filtros avanzados y búsqueda

5. Implementar exportación de datos
\`\`\`
