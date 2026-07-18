"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1C3.25 21.3 7.29 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27v-3.1H1.27A11.97 11.97 0 0 0 0 12c0 1.93.46 3.76 1.27 5.37l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.29 0 3.25 2.7 1.27 6.63l4 3.1c.95-2.85 3.6-4.96 6.73-4.96Z"
      />
    </svg>
  )
}

/// Requires the Google provider to be configured in the Supabase project
/// dashboard (Authentication → Providers → Google, with a Google Cloud
/// OAuth client ID/secret) — that's account setup only the project owner
/// can do, this button will error until it's done.
export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false)

  async function handleClick() {
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      toast.error("Não foi possível iniciar o login com Google")
      setIsLoading(false)
    }
    // On success the browser navigates away to Google's consent screen —
    // nothing else to do here.
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      loading={isLoading}
      onClick={handleClick}
    >
      {!isLoading && <GoogleIcon />}
      Continuar com Google
    </Button>
  )
}
