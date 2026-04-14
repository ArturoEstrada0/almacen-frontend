"use client"

import { useRef, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type DateRangePickerProps = {
  value?: DateRange
  onChange: (value: DateRange | undefined) => void
  placeholder?: string
  className?: string
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha de inicio y fin",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const prevStartRef = useRef<Date | undefined>(undefined)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            "w-[220px]",
            !value?.from && !value?.to && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <div className="flex flex-col items-start truncate">
            {value?.from && value?.to ? (
              <>
                <span className="text-sm truncate">{format(value.from, "PPP", { locale: es })}</span>
                <span className="text-sm text-muted-foreground truncate">{format(value.to, "PPP", { locale: es })}</span>
              </>
            ) : value?.from ? (
              <span className="text-sm truncate">{format(value.from, "PPP", { locale: es })}</span>
            ) : (
              <span className="text-sm truncate text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="p-2">
          <Calendar
            mode="range"
            selected={value?.from ? { from: value.from, to: value.to } : undefined}
            onSelect={(range) => {
              if (!range) {
                if (prevStartRef.current) {
                  const singleDay = prevStartRef.current
                  prevStartRef.current = undefined
                  onChange({ from: singleDay, to: singleDay })
                  setOpen(false)
                } else {
                  onChange(undefined)
                }
                return
              }

              const from = range.from ?? undefined
              const to = range.to ?? undefined

              if (from && to && from.toDateString() !== to.toDateString()) {
                prevStartRef.current = undefined
                onChange({ from, to })
                setOpen(false)
                return
              }

              if (prevStartRef.current && from && prevStartRef.current.toDateString() === from.toDateString()) {
                prevStartRef.current = undefined
                onChange({ from, to: from })
                setOpen(false)
                return
              }

              prevStartRef.current = from
              onChange({ from, to: undefined })
            }}
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
