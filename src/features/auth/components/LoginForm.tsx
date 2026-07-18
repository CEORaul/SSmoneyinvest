"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/FormField"
import { AuthDivider } from "@/features/auth/components/AuthDivider"
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton"
import { signIn } from "@/features/auth/actions"
import { loginSchema, type LoginInput } from "@/features/auth/schemas"

export function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? undefined

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginInput) {
    const result = await signIn(data, next)
    // signIn() redirects server-side on success — reaching this line at
    // all means it failed.
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível entrar")
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </FormField>
        <FormField label="Senha" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
        </FormField>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Esqueceu a senha?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Entrar
        </Button>
      </form>
      <AuthDivider />
      <GoogleSignInButton />
    </div>
  )
}
