"use client"

import { useContext, createContext, ReactNode } from "react"
import { User, UserPermissions, PermissionModule } from "@/lib/types/permissions"

interface PermissionsContextType {
  user: User | null
  permissions: UserPermissions | null
  hasPermission: (module: PermissionModule, action: keyof UserPermissions[PermissionModule]) => boolean
  canCreate: (module: PermissionModule) => boolean
  canRead: (module: PermissionModule) => boolean
  canUpdate: (module: PermissionModule) => boolean
  canDelete: (module: PermissionModule) => boolean
}

const PermissionsContext = createContext<PermissionsContextType | null>(null)

interface PermissionsProviderProps {
  children: ReactNode
  user: User | null
}

export function PermissionsProvider({ children, user }: PermissionsProviderProps) {
  const permissions = user?.permissions || null

  const hasPermission = (
    module: PermissionModule,
    action: keyof UserPermissions[PermissionModule]
  ): boolean => {
    if (!permissions) return false
    return permissions[module][action]
  }

  const canCreate = (module: PermissionModule) => hasPermission(module, "create")
  const canRead = (module: PermissionModule) => hasPermission(module, "read")
  const canUpdate = (module: PermissionModule) => hasPermission(module, "update")
  const canDelete = (module: PermissionModule) => hasPermission(module, "delete")

  const value = {
    user,
    permissions,
    hasPermission,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
  }

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider")
  }
  return context
}
