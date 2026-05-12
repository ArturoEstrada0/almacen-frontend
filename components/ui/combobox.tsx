"use client"

import * as React from "react"
import { createPortal } from "react-dom"
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
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number; width: number } | null>(null)

  const selectedOption = options.find((option) => String(option.value) === String(value))
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const menuRef = React.useRef<HTMLDivElement | null>(null)

  const updateMenuPosition = React.useCallback(() => {
    if (!rootRef.current) return

    const rect = rootRef.current.getBoundingClientRect()
    setMenuPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  // Close on outside click or Escape key
  React.useEffect(() => {
    if (!open) return

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node | null
      if (!target) return

      if (rootRef.current && rootRef.current.contains(target)) return
      if (menuRef.current && menuRef.current.contains(target)) return

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

  React.useEffect(() => {
    if (!open) return

    updateMenuPosition()

    const handleReposition = () => updateMenuPosition()
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)

    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open, updateMenuPosition])

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

      {open && menuPosition && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="fixed z-9999"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            width: menuPosition.width,
          }}
        >
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
        </div>,
        document.body,
      )}
    </div>
  )
}
