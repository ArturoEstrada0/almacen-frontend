"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface ComboBoxOption {
  value: string | number
  label: string
  subtitle?: string
}

interface ComboBoxProps {
  options: ComboBoxOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export function ComboBox({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "No se encontraron resultados",
  disabled = false,
  className,
}: ComboBoxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((option) => String(option.value) === String(value))
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  // Close on outside click or Escape key
  React.useEffect(() => {
    if (!open) return

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node | null
      if (!target) return

      if (rootRef.current && rootRef.current.contains(target)) return

      // Click is outside both portal and trigger - close the dropdown
      setOpen(false)
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }

    // Use bubbling phase so that portal's stopPropagation calls can prevent
    // this handler from running when clicks are inside the portal
    document.addEventListener('pointerdown', handlePointerDown, false)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, false)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn("w-full justify-between", className)}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-100000 mt-1 w-full">
          <div className={cn('bg-popover text-popover-foreground rounded-md border shadow-md overflow-hidden')}>
            <Command className="w-full">
              <div className="sticky top-0 z-10 bg-popover px-2 pt-2 pb-1">
                <CommandInput placeholder={searchPlaceholder} />
              </div>
              <CommandList
                className="pt-2 overflow-y-auto"
                style={{ maxHeight: 320 }}
              >
                  <CommandEmpty>{emptyMessage}</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={String(option.value)}
                        value={`${option.label} ${option.subtitle || ""}`}
                        onSelect={() => {
                          const newVal = String(option.value)
                          onChange(newVal === String(value) ? "" : newVal)
                          setOpen(false)
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", String(value) === String(option.value) ? "opacity-100" : "opacity-0")}/>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          {option.subtitle && <span className="text-xs text-muted-foreground">{option.subtitle}</span>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>
      )}
    </div>
  )
}
