"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, placeholder = "Selecciona una fecha", className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selected = value ? parseISO(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal w-full",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="text-sm truncate">{value ? format(selected as Date, "PPP", { locale: es }) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="p-2">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) return onChange("")
              onChange(format(date as Date, "yyyy-MM-dd"))
              setOpen(false)
            }}
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
