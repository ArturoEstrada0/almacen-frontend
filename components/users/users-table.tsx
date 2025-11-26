"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2, Power, Key } from "lucide-react"
import { User, deleteUser, toggleUserActive } from "@/lib/hooks/use-users"
import { EditUserDialog } from "./edit-user-dialog"
import { UpdatePasswordDialog } from "./update-password-dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/context/auth-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface UsersTableProps {
  users: User[]
  isLoading: boolean
  onUpdate: () => void
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  operator: "Operador",
  viewer: "Visualizador",
}

const roleColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  admin: "destructive",
  manager: "default",
  operator: "secondary",
  viewer: "outline",
}

export function UsersTable({ users, isLoading, onUpdate }: UsersTableProps) {
  const { toast } = useToast()
  const { canUpdate, canDelete } = useAuth()
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [updatingPasswordUser, setUpdatingPasswordUser] = useState<User | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  const hasUpdatePermission = canUpdate("users")
  const hasDeletePermission = canDelete("users")

  const handleToggleActive = async (user: User) => {
    try {
      await toggleUserActive(user.id)
      toast({
        title: "Usuario actualizado",
        description: `El usuario ha sido ${user.isActive ? "desactivado" : "activado"}`,
      })
      onUpdate()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!deletingUserId) return

    try {
      await deleteUser(deletingUserId)
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado del sistema",
      })
      onUpdate()
      setDeletingUserId(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell colSpan={6}>
                  <div className="h-8 bg-muted animate-pulse rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">No se encontraron usuarios</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={roleColors[user.role] || "default"}>
                    {roleLabels[user.role] || user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString("es-MX")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      {(hasUpdatePermission || hasDeletePermission) && <DropdownMenuSeparator />}
                      {hasUpdatePermission && (
                        <>
                          <DropdownMenuItem onClick={() => setEditingUser(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setUpdatingPasswordUser(user)}>
                            <Key className="mr-2 h-4 w-4" />
                            Cambiar contraseña
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                            <Power className="mr-2 h-4 w-4" />
                            {user.isActive ? "Desactivar" : "Activar"}
                          </DropdownMenuItem>
                        </>
                      )}
                      {hasDeletePermission && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingUserId(user.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                      {!hasUpdatePermission && !hasDeletePermission && (
                        <DropdownMenuItem disabled>
                          Sin permisos
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditUserDialog
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSuccess={onUpdate}
      />

      <UpdatePasswordDialog
        user={updatingPasswordUser}
        open={!!updatingPasswordUser}
        onOpenChange={(open) => !open && setUpdatingPasswordUser(null)}
      />

      <AlertDialog open={!!deletingUserId} onOpenChange={() => setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
