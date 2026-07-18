import Link from "next/link"
import { Suspense } from "react"

import { AuthCard } from "@/features/auth/components/AuthCard"
import { LoginForm } from "@/features/auth/components/LoginForm"

export default function LoginPage() {
  return (
    <AuthCard
      title="Bem-vindo de volta"
      description="Entre na sua conta para continuar."
      footer={
        <>
          Não tem uma conta?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Cadastre-se
          </Link>
        </>
      }
    >
      {/* LoginForm reads the `next` search param — App Router requires
          useSearchParams() to sit inside a Suspense boundary. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  )
}
