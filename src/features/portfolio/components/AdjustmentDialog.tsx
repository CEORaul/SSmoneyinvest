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
import { recordAdjustmentAction } from "@/features/portfolio/actions"

interface AdjustmentDialogProps {
  companyId: string
  ticker: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AdjustmentType = "BONUS" | "SPLIT" | "REVERSE_SPLIT"

const TYPE_OPTIONS: { value: AdjustmentType; label: string; hint: string }[] = [
  { value: "BONUS", label: "Bonificação", hint: "Ações/cotas recebidas gratuitamente" },
  { value: "SPLIT", label: "Desdobramento", hint: "Quantidade de ações recebidas no desdobramento" },
  { value: "REVERSE_SPLIT", label: "Grupamento", hint: "Quantidade de ações removidas no grupamento" },
]

export function AdjustmentDialog({ companyId, ticker, open, onOpenChange }: AdjustmentDialogProps) {
  const [type, setType] = useState<AdjustmentType>("BONUS")
  const [date, setDate] = useState<Date | undefined>()
  const [quantity, setQuantity] = useState("")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeOption = TYPE_OPTIONS.find((option) => option.value === type)!

  function resetForm() {
    setType("BONUS")
    setDate(undefined)
    setQuantity("")
    setNote("")
  }

  async function handleSubmit() {
    if (!date || !quantity) return

    setIsSubmitting(true)
    const result = await recordAdjustmentAction({
      companyId,
      type,
      date,
      quantity: Number(quantity),
      note: note || undefined,
    })
    setIsSubmitting(false)

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível registrar o ajuste")
      return
    }

    toast.success("Ajuste de posição registrado")
    onOpenChange(false)
    resetForm()
  }

  const canSubmit = !!date && Number(quantity) > 0

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
          <DialogTitle>Ajuste de posição — {ticker}</DialogTitle>
          <DialogDescription>Bonificação, desdobramento ou grupamento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Tipo" htmlFor="adjustment-type">
            <Select value={type} onValueChange={(value) => setType(value as AdjustmentType)}>
              <SelectTrigger id="adjustment-type" className="w-full">
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

          <FormField label="Data" htmlFor="adjustment-date">
            <DatePickerField
              id="adjustment-date"
              value={date}
              onChange={setDate}
              disabledDate={(d) => d > new Date()}
            />
          </FormField>

          <FormField label={activeOption.hint} htmlFor="adjustment-quantity">
            <Input
              id="adjustment-quantity"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </FormField>

          <FormField label="Observações (opcional)" htmlFor="adjustment-note">
            <Input
              id="adjustment-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
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
