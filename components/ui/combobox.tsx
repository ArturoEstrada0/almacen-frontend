"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
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
import { createPortal } from "react-dom"

export interface ComboBoxOption {
  value: string
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

  const selectedOption = options.find((option) => option.value === value)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const [triggerWidth, setTriggerWidth] = React.useState<number | undefined>(undefined)
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null)
  const [maxHeight, setMaxHeight] = React.useState<number | undefined>(undefined)
  const portalRef = React.useRef<HTMLDivElement | null>(null)
  const innerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    function updateCoords() {
      const r = triggerRef.current?.getBoundingClientRect()
      if (r) {
        const spaceBelow = window.innerHeight - r.bottom
        const spaceAbove = r.top
        const margin = 12
        const preferred = 320

        if (spaceBelow < 160 && spaceAbove > spaceBelow) {
          // position above
          const mh = Math.min(preferred, Math.max(120, spaceAbove - margin))
          setMaxHeight(mh)
          setCoords({ top: r.top + window.scrollY - mh, left: r.left + window.scrollX })
        } else {
          // position below
          const mh = Math.min(preferred, Math.max(120, spaceBelow - margin))
          setMaxHeight(mh)
          setCoords({ top: r.bottom + window.scrollY, left: r.left + window.scrollX })
        }
        setTriggerWidth(r.width)
      }
    }

    if (open) updateCoords()
    window.addEventListener('resize', updateCoords)
    window.addEventListener('scroll', updateCoords, true)
    return () => {
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords, true)
    }
  }, [open])

  // Adjust position using actual content height so the portal sticks to trigger when
  // positioned above (avoids gap when content is shorter than the reserved maxHeight)
  React.useEffect(() => {
    if (!open || !coords) return

    let rafId: number | null = null
    rafId = requestAnimationFrame(() => {
      const inner = innerRef.current
      const trigger = triggerRef.current
      if (!inner || !trigger) return

      const contentH = inner.offsetHeight
      const r = trigger.getBoundingClientRect()
      const spaceBelow = window.innerHeight - r.bottom
      const spaceAbove = r.top
      const margin = 12

      if (spaceBelow < 160 && spaceAbove > spaceBelow) {
        // positioned above -> align bottom of content with top of trigger
        const newTop = Math.max(margin, r.top + window.scrollY - contentH)
        if (Math.abs((coords.top || 0) - newTop) > 1) setCoords({ top: newTop, left: coords.left! })
      } else {
        // positioned below -> ensure top aligns with trigger bottom
        const newTop = r.bottom + window.scrollY
        if (Math.abs((coords.top || 0) - newTop) > 1) setCoords({ top: newTop, left: coords.left! })
      }
    })

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [open, coords?.top, coords?.left])

  // Observe size changes of the inner content so the portal repositions while typing
  React.useEffect(() => {
    if (!open || !innerRef.current || !triggerRef.current) return

    let rafId: number | null = null
    const ro = new (window as any).ResizeObserver(() => {
      if (rafId != null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const inner = innerRef.current
        const trigger = triggerRef.current
        if (!inner || !trigger) return

        const contentH = inner.offsetHeight
        const r = trigger.getBoundingClientRect()
        const spaceBelow = window.innerHeight - r.bottom
        const spaceAbove = r.top
        const margin = 12

        if (spaceBelow < 160 && spaceAbove > spaceBelow) {
          const newTop = Math.max(margin, r.top + window.scrollY - contentH)
          const left = coords?.left ?? (r.left + window.scrollX)
          if (Math.abs((coords?.top || 0) - newTop) > 1) setCoords({ top: newTop, left })
        } else {
          const newTop = r.bottom + window.scrollY
          const left = coords?.left ?? (r.left + window.scrollX)
          if (Math.abs((coords?.top || 0) - newTop) > 1) setCoords({ top: newTop, left })
        }
      })
    })

    ro.observe(innerRef.current)

    return () => {
      ro.disconnect()
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [open, coords?.left, coords?.top])

  // Prevent page/body scroll when portal is open to avoid the large outer scrollbar
  React.useEffect(() => {
    if (!open) return

    const prevOverflow = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`

    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPaddingRight
    }
  }, [open])

  // Close on outside click or Escape key
  React.useEffect(() => {
    if (!open) return

    function handlePointerDown(e: PointerEvent) {
      const path = e.composedPath ? e.composedPath() : (e as any).path || []
      const clickedInsidePortal = portalRef.current && path.includes(portalRef.current)
      const clickedTrigger = triggerRef.current && path.includes(triggerRef.current)
      if (!clickedInsidePortal && !clickedTrigger) {
        setOpen(false)
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <>
      <Button
        ref={triggerRef}
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

      {open && coords && createPortal(
        <div
          ref={portalRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', top: coords.top, left: coords.left, width: triggerWidth, zIndex: 9999 }}
        >
             <div ref={innerRef} className={cn('bg-popover text-popover-foreground rounded-md border shadow-md')}
               style={{ maxHeight: maxHeight || 320, display: 'flex', flexDirection: 'column' }}>
            <Command>
              <div className="sticky top-0 z-10 bg-popover px-2 pt-2 pb-1">
                <CommandInput placeholder={searchPlaceholder} />
              </div>
              <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as any}>
                <CommandList className="pt-2">
                  <CommandEmpty>{emptyMessage}</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={`${option.label} ${option.subtitle || ""}`}
                        onSelect={() => {
                          onChange(option.value === value ? "" : option.value)
                          setOpen(false)
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")}/>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          {option.subtitle && <span className="text-xs text-muted-foreground">{option.subtitle}</span>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </div>
            </Command>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
