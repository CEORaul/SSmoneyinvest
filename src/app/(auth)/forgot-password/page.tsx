import Link from "next/link"

import { AuthCard } from "@/features/auth/components/AuthCard"
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm"

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar senha"
      description="Enviaremos um link para redefinir sua senha."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
