"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface ProductorComboBoxOption {
  value: string
  label: string
  subtitle?: string
}

interface ProductorComboBoxProps {
  options: ProductorComboBoxOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export function ProductorComboBox({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "No se encontraron resultados",
  disabled = false,
  className,
}: ProductorComboBoxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const selectedOption = options.find((option) => String(option.value) === String(value))

  const filteredOptions = options.filter((option) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      option.label.toLowerCase().includes(searchLower) ||
      (option.subtitle || "").toLowerCase().includes(searchLower)
    )
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command className="w-full" shouldFilter={false}>
          <div className="sticky top-0 z-10 bg-popover px-2 pt-2 pb-1">
            <CommandInput 
              placeholder={searchPlaceholder} 
              value={searchTerm} 
              onValueChange={setSearchTerm}
              className="h-9"
            />
          </div>
          <CommandList
            className="overflow-y-auto overscroll-contain"
            style={{ maxHeight: "320px" }}
            onWheelCapture={(e) => e.stopPropagation()}
          >
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={String(option.value)}
                  value={`${option.label} ${option.subtitle || ""}`}
                  onSelect={() => {
                    const newVal = String(option.value)
                    onChange(newVal === String(value) ? "" : newVal)
                    setOpen(false)
                    setSearchTerm("")
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      String(value) === String(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.subtitle && <span className="text-xs text-muted-foreground">{option.subtitle}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
