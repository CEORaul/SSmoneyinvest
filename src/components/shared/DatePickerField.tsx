"use client"

import { CalendarIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerFieldProps {
  id?: string
  value?: Date
  onChange: (date: Date | undefined) => void
  disabledDate?: (date: Date) => boolean
  placeholder?: string
}

export function DatePickerField({
  id,
  value,
  onChange,
  disabledDate,
  placeholder = "Selecione uma data",
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn("w-full justify-start font-normal", !value && "text-muted-foreground")}
          />
        }
      >
        <CalendarIcon className="size-4" />
        {value ? value.toLocaleDateString("pt-BR") : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
          }}
          disabled={disabledDate}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
