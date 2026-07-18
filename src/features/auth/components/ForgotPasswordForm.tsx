"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { MailCheck } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/FormField"
import { requestPasswordReset } from "@/features/auth/actions"
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/schemas"

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })

  async function onSubmit(data: ForgotPasswordInput) {
    const result = await requestPasswordReset(data)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível enviar o email")
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <MailCheck className="size-10 text-primary" />
        <p className="text-sm text-muted-foreground">
          Se este email estiver cadastrado, enviamos um link para redefinir
          sua senha.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
      </FormField>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Enviar link de recuperação
      </Button>
    </form>
  )
}
