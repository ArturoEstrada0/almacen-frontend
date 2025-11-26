// Permission types for the system

export interface ModulePermissions {
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
}

export interface UserPermissions {
  products: ModulePermissions
  inventory: ModulePermissions
  movements: ModulePermissions
  suppliers: ModulePermissions
  purchaseOrders: ModulePermissions
  warehouses: ModulePermissions
  producers: ModulePermissions
  reports: ModulePermissions
  users: ModulePermissions
}

export type PermissionModule = keyof UserPermissions

export interface User {
  id: string
  email: string
  fullName: string
  role: "admin" | "manager" | "operator" | "viewer"
  permissions: UserPermissions
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<string, UserPermissions> = {
  admin: {
    products: { create: true, read: true, update: true, delete: true },
    inventory: { create: true, read: true, update: true, delete: true },
    movements: { create: true, read: true, update: true, delete: true },
    suppliers: { create: true, read: true, update: true, delete: true },
    purchaseOrders: { create: true, read: true, update: true, delete: true },
    warehouses: { create: true, read: true, update: true, delete: true },
    producers: { create: true, read: true, update: true, delete: true },
    reports: { create: true, read: true, update: true, delete: true },
    users: { create: true, read: true, update: true, delete: true },
  },
  manager: {
    products: { create: true, read: true, update: true, delete: false },
    inventory: { create: true, read: true, update: true, delete: false },
    movements: { create: true, read: true, update: true, delete: false },
    suppliers: { create: true, read: true, update: true, delete: false },
    purchaseOrders: { create: true, read: true, update: true, delete: false },
    warehouses: { create: false, read: true, update: false, delete: false },
    producers: { create: true, read: true, update: true, delete: false },
    reports: { create: true, read: true, update: false, delete: false },
    users: { create: false, read: true, update: false, delete: false },
  },
  operator: {
    products: { create: false, read: true, update: true, delete: false },
    inventory: { create: false, read: true, update: true, delete: false },
    movements: { create: true, read: true, update: false, delete: false },
    suppliers: { create: false, read: true, update: false, delete: false },
    purchaseOrders: { create: false, read: true, update: true, delete: false },
    warehouses: { create: false, read: true, update: false, delete: false },
    producers: { create: false, read: true, update: true, delete: false },
    reports: { create: false, read: true, update: false, delete: false },
    users: { create: false, read: false, update: false, delete: false },
  },
  viewer: {
    products: { create: false, read: true, update: false, delete: false },
    inventory: { create: false, read: true, update: false, delete: false },
    movements: { create: false, read: true, update: false, delete: false },
    suppliers: { create: false, read: true, update: false, delete: false },
    purchaseOrders: { create: false, read: true, update: false, delete: false },
    warehouses: { create: false, read: true, update: false, delete: false },
    producers: { create: false, read: true, update: false, delete: false },
    reports: { create: false, read: true, update: false, delete: false },
    users: { create: false, read: false, update: false, delete: false },
  },
}

// Module labels for UI
export const MODULE_LABELS: Record<PermissionModule, string> = {
  products: "Productos",
  inventory: "Inventario",
  movements: "Movimientos",
  suppliers: "Proveedores",
  purchaseOrders: "Órdenes de Compra",
  warehouses: "Almacenes",
  producers: "Productores",
  reports: "Reportes",
  users: "Usuarios",
}

// Permission action labels
export const PERMISSION_LABELS = {
  create: "Crear",
  read: "Ver",
  update: "Editar",
  delete: "Eliminar",
}
