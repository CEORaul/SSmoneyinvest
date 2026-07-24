"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/FormField"
import { PasswordInput } from "@/components/shared/PasswordInput"
import { AuthDivider } from "@/features/auth/components/AuthDivider"
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton"
import { signUp } from "@/features/auth/actions"
import { registerSchema, type RegisterInput } from "@/features/auth/schemas"

export function RegisterForm() {
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  async function onSubmit(data: RegisterInput) {
    const result = await signUp(data)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível criar sua conta")
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="size-10 text-gain" />
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para o seu email. Verifique sua
          caixa de entrada para ativar sua conta.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Nome completo" htmlFor="fullName" error={errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" {...register("fullName")} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </FormField>
        <FormField label="Senha" htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            {...register("password")}
          />
        </FormField>
        <FormField
          label="Confirmar senha"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        </FormField>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Criar conta
        </Button>
      </form>
      <AuthDivider />
      <GoogleSignInButton />
    </div>
  )
}
