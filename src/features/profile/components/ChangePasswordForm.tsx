"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/FormField"
import { updatePassword } from "@/features/auth/actions"
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/schemas"

// Reuses the exact same schema and Server Action as the post-recovery-link
// reset form (src/features/auth/) — same rules, same endpoint, no reason
// to duplicate either.
export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  async function onSubmit(data: ResetPasswordInput) {
    const result = await updatePassword(data)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível atualizar sua senha")
      return
    }
    toast.success("Senha atualizada com sucesso")
    reset()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alterar senha</CardTitle>
        <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nova senha" htmlFor="new-password" error={errors.password?.message}>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
          </FormField>
          <FormField
            label="Confirmar nova senha"
            htmlFor="new-confirm-password"
            error={errors.confirmPassword?.message}
          >
            <Input
              id="new-confirm-password"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
          </FormField>
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" loading={isSubmitting}>
              Atualizar senha
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
