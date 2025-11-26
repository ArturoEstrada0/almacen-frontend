"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { User, updateUser } from "@/lib/hooks/use-users"
import { PermissionsEditor } from "./permissions-editor"
import { UserPermissions, DEFAULT_PERMISSIONS } from "@/lib/types/permissions"

interface EditUserDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormData {
  email: string
  fullName: string
  role: "admin" | "manager" | "operator" | "viewer"
  password?: string
}

export function EditUserDialog({ user, open, onOpenChange, onSuccess }: EditUserDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS.operator)
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>()

  const selectedRole = watch("role")

  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        password: "",
      })
      setPermissions(user.permissions || DEFAULT_PERMISSIONS[user.role])
    }
  }, [user, reset])

  // Actualizar permisos cuando cambia el rol (solo si se cambia manualmente)
  useEffect(() => {
    if (selectedRole && user && selectedRole !== user.role) {
      setPermissions(DEFAULT_PERMISSIONS[selectedRole])
    }
  }, [selectedRole, user])

  const onSubmit = async (data: FormData) => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const updateData: any = {
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        permissions,
      }

      // Solo incluir password si se proporcionó uno nuevo
      if (data.password && data.password.trim()) {
        updateData.password = data.password
      }

      await updateUser(user.id, updateData)
      toast({
        title: "Usuario actualizado",
        description: "Los datos del usuario han sido actualizados",
      })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Modifica los datos y permisos del usuario
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Nombre Completo</Label>
              <Input
                id="fullName"
                {...register("fullName", { required: "El nombre es requerido" })}
                placeholder="Juan Pérez"
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email", {
                  required: "El email es requerido",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Email inválido",
                  },
                })}
                placeholder="usuario@ejemplo.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Rol</Label>
              <Select
                value={selectedRole}
                onValueChange={(value: "admin" | "manager" | "operator" | "viewer") => setValue("role", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Nueva Contraseña (opcional)</Label>
              <Input
                id="password"
                type="password"
                {...register("password", {
                  minLength: {
                    value: 6,
                    message: "La contraseña debe tener al menos 6 caracteres",
                  },
                })}
                placeholder="Dejar en blanco para no cambiar"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Deja este campo vacío si no deseas cambiar la contraseña
              </p>
            </div>

            <div className="border-t pt-4">
              <PermissionsEditor
                role={selectedRole}
                permissions={permissions}
                onChange={setPermissions}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
