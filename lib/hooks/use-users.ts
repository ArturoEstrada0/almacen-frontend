"use client"

import useSWR from "swr"
import { ApiClient, API_ENDPOINTS } from "@/lib/config/api"
import { UserPermissions } from "@/lib/types/permissions"

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

const fetcher = <T,>(url: string): Promise<T> => ApiClient.get<T>(url)

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<User[]>(
    API_ENDPOINTS.users.list(),
    fetcher<User[]>,
    {
      onSuccess: (data) => {
        console.log('✅ Usuarios cargados:', data)
      },
      onError: (error) => {
        console.error('❌ Error cargando usuarios:', error)
      }
    }
  )

  return {
    users: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useUser(id: string | null) {
  const { data, error, isLoading } = useSWR<User>(
    id ? API_ENDPOINTS.users.get(id) : null,
    fetcher<User>
  )

  return {
    user: data,
    isLoading,
    isError: error,
  }
}

export async function createUser(data: {
  email: string
  password: string
  fullName: string
  role: string
  isActive?: boolean
  permissions?: UserPermissions
}) {
  return ApiClient.post(API_ENDPOINTS.users.create(), data)
}

export async function updateUser(id: string, data: Partial<{
  email: string
  password: string
  fullName: string
  role: string
  isActive: boolean
  permissions: UserPermissions
}>) {
  return ApiClient.patch(API_ENDPOINTS.users.update(id), data)
}

export async function deleteUser(id: string) {
  return ApiClient.delete(API_ENDPOINTS.users.delete(id))
}

export async function toggleUserActive(id: string) {
  return ApiClient.patch(API_ENDPOINTS.users.toggleActive(id), {})
}

export async function updateUserPassword(id: string, currentPassword: string, newPassword: string) {
  return ApiClient.post(API_ENDPOINTS.users.updatePassword(id), {
    currentPassword,
    newPassword,
  })
}
