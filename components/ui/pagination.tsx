"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaginationProps {
  currentPage: number
  perPage?: number
  totalItems: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, perPage = 20, totalItems, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
  const start = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1
  const end = Math.min(currentPage * perPage, totalItems)

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-muted-foreground">
        Mostrando {start} - {end} de {totalItems}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <div className="text-sm px-2">
          {currentPage} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          Siguiente <ChevronRightIcon className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

export function PaginationContent({
  className,
  ...props
}: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  )
}

export function PaginationItem({
  className,
  ...props
}: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" className={cn('', className)} {...props} />
}

function PaginationLink({
  isActive,
  className,
  ...props
}: React.ComponentProps<'a'> & {
  isActive?: boolean
}) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      className={cn('', className)}
      {...props}
    />
  )
}

export function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<'a'>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      data-slot="pagination-previous"
      className={cn('gap-1 pl-2.5', className)}
      {...props}
    >
      <ChevronLeftIcon className="h-4 w-4" />
      <span>Previous</span>
    </PaginationLink>
  )
}

export function PaginationNext({
  className,
  ...props
}: React.ComponentProps<'a'>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      data-slot="pagination-next"
      className={cn('gap-1 pr-2.5', className)}
      {...props}
    >
      <span>Next</span>
      <ChevronRightIcon className="h-4 w-4" />
    </PaginationLink>
  )
}

export function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      <span>...</span>
    </span>
  )
}
