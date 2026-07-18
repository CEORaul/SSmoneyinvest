import Link from "next/link"

import { AuthCard } from "@/features/auth/components/AuthCard"
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm"
import { getSession } from "@/lib/auth/session"

export default async function ResetPasswordPage() {
  // Reached two ways: (1) via /auth/callback after clicking the recovery
  // email link, which establishes a temporary recovery session — the
  // normal case; (2) directly, with no session — show a clear dead-end
  // instead of a broken form.
  const user = await getSession()

  if (!user) {
    return (
      <AuthCard
        title="Link inválido ou expirado"
        description="Solicite um novo link para redefinir sua senha."
      >
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Voltar para recuperação de senha
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Defina uma nova senha"
      description="Escolha uma senha forte para sua conta."
    >
      <ResetPasswordForm />
    </AuthCard>
  )
}
