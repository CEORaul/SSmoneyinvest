"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/FormField"
import { updatePassword } from "@/features/auth/actions"
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/schemas"

export function ResetPasswordForm() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  async function onSubmit(data: ResetPasswordInput) {
    const result = await updatePassword(data)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível atualizar sua senha")
      return
    }
    toast.success("Senha atualizada com sucesso")
    router.push("/perfil")
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Nova senha" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
      </FormField>
      <FormField
        label="Confirmar nova senha"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
      </FormField>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Redefinir senha
      </Button>
    </form>
  )
}
