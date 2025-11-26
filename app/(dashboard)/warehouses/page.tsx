"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { useWarehouses } from "@/lib/hooks/use-warehouses"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

export default function WarehousesPage() {
  const { warehouses, isLoading } = useWarehouses()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Almacenes</h1>
          <p className="text-muted-foreground">Gestión de almacenes y ubicaciones</p>
        </div>
        <Link href="/warehouses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Almacén
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Lista de almacenes obtenida desde el backend</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando almacenes...</p>
          ) : warehouses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay almacenes creados aún.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Dirección</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((wh) => (
                    <TableRow key={wh.id}>
                        <TableCell>{wh.name}</TableCell>
                        <TableCell className="font-mono text-sm">{wh.code}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{((wh as any).address as string) || (wh as any).location || "-"}</TableCell>
                      </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
