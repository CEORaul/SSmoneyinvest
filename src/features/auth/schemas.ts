import { z } from "zod"

const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .regex(/[a-z]/, "A senha deve conter ao menos uma letra minúscula")
  .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiúscula")
  .regex(/[0-9]/, "A senha deve conter ao menos um número")

export const loginSchema = z.object({
  email: z.string().min(1, "Informe seu email").email("Email inválido"),
  password: z.string().min(1, "Informe sua senha"),
})
export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Informe seu nome completo"),
    email: z.string().min(1, "Informe seu email").email("Email inválido"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })
export type RegisterInput = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Informe seu email").email("Email inválido"),
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

// Also reused as-is by the "change password" form on /perfil — same shape,
// same rules, no reason to duplicate it.
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
