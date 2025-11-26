"use client"

import { ReactNode } from "react"
import { useAuth } from "@/lib/context/auth-context"
import { PermissionModule } from "@/lib/types/permissions"

interface ProtectedActionProps {
  module: PermissionModule
  action: "create" | "read" | "update" | "delete"
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Componente que muestra u oculta su contenido basado en los permisos del usuario
 */
export function ProtectedAction({ module, action, children, fallback = null }: ProtectedActionProps) {
  const { hasPermission } = useAuth()

  if (!hasPermission(module, action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface ProtectedCreateProps {
  module: PermissionModule
  children: ReactNode
  fallback?: ReactNode
}

export function ProtectedCreate({ module, children, fallback = null }: ProtectedCreateProps) {
  return <ProtectedAction module={module} action="create" fallback={fallback}>{children}</ProtectedAction>
}

interface ProtectedReadProps {
  module: PermissionModule
  children: ReactNode
  fallback?: ReactNode
}

export function ProtectedRead({ module, children, fallback = null }: ProtectedReadProps) {
  return <ProtectedAction module={module} action="read" fallback={fallback}>{children}</ProtectedAction>
}

interface ProtectedUpdateProps {
  module: PermissionModule
  children: ReactNode
  fallback?: ReactNode
}

export function ProtectedUpdate({ module, children, fallback = null }: ProtectedUpdateProps) {
  return <ProtectedAction module={module} action="update" fallback={fallback}>{children}</ProtectedAction>
}

interface ProtectedDeleteProps {
  module: PermissionModule
  children: ReactNode
  fallback?: ReactNode
}

export function ProtectedDelete({ module, children, fallback = null }: ProtectedDeleteProps) {
  return <ProtectedAction module={module} action="delete" fallback={fallback}>{children}</ProtectedAction>
}
