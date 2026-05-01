"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useProducts } from "@/lib/hooks/use-products"
import { formatCurrency } from "@/lib/utils/format"
import { Plus, Search, Edit, Trash2, ImageIcon, ListTree } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/lib/utils/toast"
import { deleteProduct } from "@/lib/actions/products"
import { ProtectedCreate, ProtectedUpdate, ProtectedDelete } from "@/components/auth/protected-action"
import { extractErrorMessage } from "@/lib/utils/error-handler"
import { TablePagination, usePagination } from "@/components/ui/table-pagination"
import Spinner2 from "@/components/ui/spinner2"
import { useCategories } from "@/lib/hooks/use-categories"
import { useProductTypes } from "@/lib/hooks/use-product-types"
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

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  const { products, isLoading, mutate } = useProducts()
  const { categories: catalogCategories } = useCategories()
  const { productTypes } = useProductTypes()

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType =
      filterType === "all" || String(product.type || "").toLowerCase() === String(filterType).toLowerCase()
    const matchesCategory = filterCategory === "all" || product.categoryId === filterCategory
    return matchesSearch && matchesType && matchesCategory
  })

  // Pagination
  const { pagedItems: pagedProducts, paginationProps } = usePagination(filteredProducts, 20)

  const handleDelete = async () => {
    if (!productToDelete) return

    const loadingToast = toast.loading("Eliminando producto...")

    try {
      const result = await deleteProduct(productToDelete)

      if (result.error) {
        toast.dismiss(loadingToast)
        toast.error(extractErrorMessage(result.error))
      } else {
        toast.dismiss(loadingToast)
        toast.success("Producto eliminado correctamente")
        mutate() // Revalidate data
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(extractErrorMessage(error))
    } finally {
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const productTypeOptions = [
    { value: "all", label: "Todos los tipos" },
    ...productTypes.map((typeItem: any) => ({ value: typeItem.name, label: typeItem.name })),
  ]

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner2 />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">Gestión completa del catálogo de productos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/product-catalog">
              <ListTree className="mr-2 h-4 w-4" />
              Administrar tipos y categorías
            </Link>
          </Button>
          <ProtectedCreate module="products">
            <Link href="/products/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Producto
              </Button>
            </Link>
          </ProtectedCreate>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tipo de producto" />
              </SelectTrigger>
              <SelectContent>
                {productTypeOptions.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {catalogCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Productos</CardTitle>
          <CardDescription>
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""} encontrado
            {filteredProducts.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagen</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio Costo</TableHead>
                <TableHead>Precio Venta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              ) : (
                pagedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl || "/placeholder.svg"}
                            alt={product.name}
                            width={48}
                            height={48}
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {product.type || "Sin tipo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {product.category?.name || "Sin categoría"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(Number((product as any).costPrice || 0))}</TableCell>
                    <TableCell>{formatCurrency(Number((product as any).salePrice || 0))}</TableCell>
                    <TableCell>
                      <Badge variant={(product as any).isActive ? "default" : "secondary"}>
                        {(product as any).isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <ProtectedUpdate module="products">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/products/${product.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </ProtectedUpdate>
                        <ProtectedDelete module="products">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setProductToDelete(product.id)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ProtectedDelete>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination {...paginationProps} />
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará el producto como inactivo. No se eliminará permanentemente pero no aparecerá en las
              listas activas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
