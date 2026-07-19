"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePickerField } from "@/components/shared/DatePickerField"
import { FormField } from "@/components/shared/FormField"
import { recordIncomeAction } from "@/features/portfolio/actions"

interface IncomeDialogProps {
  companyId: string
  ticker: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TYPE_OPTIONS = [
  { value: "DIVIDEND", label: "Dividendo" },
  { value: "JCP", label: "JSCP (Juros sobre Capital Próprio)" },
]

/// Manual entry — this phase prepares the data model for auto-associating
/// DividendPayment history with positions, but the actual automation is
/// deliberately out of scope here (per the brief).
export function IncomeDialog({ companyId, ticker, open, onOpenChange }: IncomeDialogProps) {
  const [type, setType] = useState<"DIVIDEND" | "JCP">("DIVIDEND")
  const [date, setDate] = useState<Date | undefined>()
  const [quantity, setQuantity] = useState("")
  const [amountPerShare, setAmountPerShare] = useState("")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetForm() {
    setType("DIVIDEND")
    setDate(undefined)
    setQuantity("")
    setAmountPerShare("")
    setNote("")
  }

  async function handleSubmit() {
    if (!date || !quantity || !amountPerShare) return

    setIsSubmitting(true)
    const result = await recordIncomeAction({
      companyId,
      type,
      date,
      quantity: Number(quantity),
      amountPerShareCents: Math.round(Number(amountPerShare) * 100),
      note: note || undefined,
    })
    setIsSubmitting(false)

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível registrar o provento")
      return
    }

    toast.success("Provento registrado")
    onOpenChange(false)
    resetForm()
  }

  const canSubmit = !!date && Number(quantity) > 0 && Number(amountPerShare) > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) resetForm()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar provento — {ticker}</DialogTitle>
          <DialogDescription>Dividendo ou JSCP recebido.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Tipo" htmlFor="income-type">
            <Select value={type} onValueChange={(value) => setType(value as "DIVIDEND" | "JCP")}>
              <SelectTrigger id="income-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Data" htmlFor="income-date">
            <DatePickerField
              id="income-date"
              value={date}
              onChange={setDate}
              disabledDate={(d) => d > new Date()}
            />
          </FormField>

          <FormField label="Quantidade de ações/cotas" htmlFor="income-quantity">
            <Input
              id="income-quantity"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </FormField>

          <FormField label="Valor por ação/cota" htmlFor="income-amount">
            <Input
              id="income-amount"
              type="number"
              min="0"
              step="0.000001"
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={amountPerShare}
              onChange={(event) => setAmountPerShare(event.target.value)}
            />
          </FormField>

          <FormField label="Observações (opcional)" htmlFor="income-note">
            <Input id="income-note" value={note} onChange={(event) => setNote(event.target.value)} />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting} disabled={!canSubmit}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
