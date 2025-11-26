"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  UserPermissions, 
  DEFAULT_PERMISSIONS, 
  MODULE_LABELS, 
  PERMISSION_LABELS,
  PermissionModule 
} from "@/lib/types/permissions"

interface PermissionsEditorProps {
  role: "admin" | "manager" | "operator" | "viewer"
  permissions: UserPermissions
  onChange: (permissions: UserPermissions) => void
  disabled?: boolean
}

export function PermissionsEditor({ role, permissions, onChange, disabled = false }: PermissionsEditorProps) {
  const [customPermissions, setCustomPermissions] = useState<UserPermissions>(permissions)
  const [isCustom, setIsCustom] = useState(false)

  useEffect(() => {
    // Verificar si los permisos son personalizados comparando con los por defecto
    const defaultPerms = DEFAULT_PERMISSIONS[role]
    const areCustom = JSON.stringify(permissions) !== JSON.stringify(defaultPerms)
    setIsCustom(areCustom)
    setCustomPermissions(permissions)
  }, [role, permissions])

  const handleUseDefaults = () => {
    const defaultPerms = DEFAULT_PERMISSIONS[role]
    setCustomPermissions(defaultPerms)
    setIsCustom(false)
    onChange(defaultPerms)
  }

  const handleCustomize = () => {
    setIsCustom(true)
  }

  const handlePermissionChange = (
    module: PermissionModule,
    action: keyof UserPermissions[PermissionModule],
    value: boolean
  ) => {
    const updated = {
      ...customPermissions,
      [module]: {
        ...customPermissions[module],
        [action]: value,
      },
    }
    setCustomPermissions(updated)
    onChange(updated)
  }

  const modules = Object.keys(MODULE_LABELS) as PermissionModule[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Permisos del Usuario</Label>
        <div className="flex gap-2">
          {isCustom && (
            <button
              type="button"
              onClick={handleUseDefaults}
              className="text-sm text-primary hover:underline"
              disabled={disabled}
            >
              Usar permisos por defecto
            </button>
          )}
          {!isCustom && (
            <button
              type="button"
              onClick={handleCustomize}
              className="text-sm text-primary hover:underline"
              disabled={disabled}
            >
              Personalizar permisos
            </button>
          )}
        </div>
      </div>

      {!isCustom ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Permisos por Defecto</CardTitle>
            <CardDescription>
              Este usuario tiene los permisos estándar del rol {role}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modules.map((module) => {
                const modulePerms = DEFAULT_PERMISSIONS[role][module]
                const activePerms = Object.entries(modulePerms)
                  .filter(([_, value]) => value)
                  .map(([key]) => PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS])
                
                return (
                  <div key={module} className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{MODULE_LABELS[module]}</div>
                      <div className="text-xs text-muted-foreground">
                        {activePerms.length > 0 ? activePerms.join(", ") : "Sin permisos"}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={modules[0]} className="w-full">
          <TabsList className="grid grid-cols-3 lg:grid-cols-5 w-full">
            {modules.slice(0, 5).map((module) => (
              <TabsTrigger key={module} value={module} className="text-xs">
                {MODULE_LABELS[module]}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsList className="grid grid-cols-3 lg:grid-cols-4 w-full mt-2">
            {modules.slice(5).map((module) => (
              <TabsTrigger key={module} value={module} className="text-xs">
                {MODULE_LABELS[module]}
              </TabsTrigger>
            ))}
          </TabsList>

          {modules.map((module) => (
            <TabsContent key={module} value={module}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Permisos de {MODULE_LABELS[module]}</CardTitle>
                  <CardDescription>
                    Configura los permisos para el módulo de {MODULE_LABELS[module].toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(Object.keys(PERMISSION_LABELS) as Array<keyof typeof PERMISSION_LABELS>).map((action) => (
                    <div key={action} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${module}-${action}`}
                        checked={customPermissions[module][action]}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(module, action, checked as boolean)
                        }
                        disabled={disabled}
                      />
                      <Label
                        htmlFor={`${module}-${action}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {PERMISSION_LABELS[action]}
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
