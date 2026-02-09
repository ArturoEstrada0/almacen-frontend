"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

export interface TablePaginationProps {
  totalItems: number
  pageSize: number
  currentPage: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
}

export function TablePagination({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Mostrando</span>
        <span className="font-medium text-foreground">{startItem}</span>
        <span>-</span>
        <span className="font-medium text-foreground">{endItem}</span>
        <span>de</span>
        <span className="font-medium text-foreground">{totalItems}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Por página:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm mx-2 min-w-20 text-center">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Hook para facilitar el uso de la paginación
export function usePagination<T>(items: T[], defaultPageSize = 20): {
  pagedItems: T[]
  currentPage: number
  pageSize: number
  totalPages: number
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  paginationProps: Omit<TablePaginationProps, 'pageSizeOptions'>
} {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const pagedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Reset to page 1 when items or pageSize change
  useEffect(() => {
    setCurrentPage(1)
  }, [items.length, pageSize])

  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  return {
    pagedItems,
    currentPage,
    pageSize,
    totalPages,
    setCurrentPage,
    setPageSize: handlePageSizeChange,
    paginationProps: {
      totalItems: items.length,
      pageSize,
      currentPage,
      onPageChange: setCurrentPage,
      onPageSizeChange: handlePageSizeChange,
    },
  }
}
