"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTheme } from "next-themes"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormField } from "@/components/shared/FormField"
import { updatePreferences } from "@/features/profile/actions"
import { preferencesSchema, type PreferencesInput } from "@/features/profile/schemas"

const THEME_OPTIONS = [
  { value: "LIGHT", label: "☀ Claro" },
  { value: "DARK", label: "🌙 Escuro" },
  { value: "SYSTEM", label: "Automático (sistema)" },
]
const LAYOUT_OPTIONS = [
  { value: "COMFORTABLE", label: "Confortável" },
  { value: "COMPACT", label: "Compacto" },
]
const EXPERIENCE_OPTIONS = [
  { value: "BEGINNER", label: "Iniciante" },
  { value: "ADVANCED", label: "Avançado" },
]
const LOCALE_OPTIONS = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (em breve)" },
]
const CURRENCY_OPTIONS = [
  { value: "BRL", label: "Real (R$)" },
  { value: "USD", label: "Dólar (US$) — em breve" },
]

interface SelectFieldProps {
  name: keyof PreferencesInput
  label: string
  options: { value: string; label: string }[]
}

interface PreferencesFormProps {
  defaultValues: PreferencesInput
}

export function PreferencesForm({ defaultValues }: PreferencesFormProps) {
  const { setTheme } = useTheme()
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PreferencesInput>({
    resolver: zodResolver(preferencesSchema),
    defaultValues,
  })

  async function onSubmit(data: PreferencesInput) {
    const result = await updatePreferences(data)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar suas preferências")
      return
    }
    setTheme(data.theme.toLowerCase())
    toast.success("Preferências salvas")
  }

  function renderSelectField({ name, label, options }: SelectFieldProps) {
    return (
      <Controller
        key={name}
        control={control}
        name={name}
        render={({ field }) => (
          <FormField label={label} htmlFor={name}>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={name} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferências</CardTitle>
        <CardDescription>Personalize sua experiência na plataforma.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {renderSelectField({ name: "theme", label: "Tema", options: THEME_OPTIONS })}
          {renderSelectField({
            name: "experienceMode",
            label: "Modo",
            options: EXPERIENCE_OPTIONS,
          })}
          {renderSelectField({ name: "layout", label: "Layout", options: LAYOUT_OPTIONS })}
          {renderSelectField({ name: "locale", label: "Idioma", options: LOCALE_OPTIONS })}
          {renderSelectField({ name: "currency", label: "Moeda", options: CURRENCY_OPTIONS })}
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" loading={isSubmitting}>
              Salvar preferências
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
