"use client"

import { Eye, EyeOff } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useState, type ComponentProps, type Ref } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PasswordInputProps extends ComponentProps<"input"> {
  ref?: Ref<HTMLInputElement>
}

/// Same show/hide toggle for every password field in the app (login,
/// cadastro, recuperação/redefinição, alteração de senha, confirmar senha)
/// — one component so the behavior and animation never drift between forms.
/// Defaults to hidden on every mount; there's no "remember this choice"
/// state, matching how every other password manager/browser treats it.
export function PasswordInput({ className, ref, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-8", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={visible ? "visible" : "hidden"}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  )
}
