import Link from "next/link"

import { AuthCard } from "@/features/auth/components/AuthCard"
import { RegisterForm } from "@/features/auth/components/RegisterForm"

export default function RegisterPage() {
  return (
    <AuthCard
      title="Crie sua conta"
      description="Comece a acompanhar seus investimentos gratuitamente."
      footer={
        <>
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  )
}
