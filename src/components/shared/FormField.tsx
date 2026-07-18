import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  className?: string
  children: React.ReactNode
}

/// Every auth/profile form composes this instead of hand-rolling
/// label+input+error markup — shadcn's Nova preset dropped the old
/// Radix-based `Form` wrapper component, so this is the reusable
/// replacement for that pattern in this project.
export function FormField({ label, htmlFor, error, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
