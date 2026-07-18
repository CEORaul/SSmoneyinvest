"use client"

import Link from "next/link"
import { LogOut, User } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { signOut } from "@/features/auth/actions"

interface NavUserMenuProps {
  fullName: string | null
  email: string
  avatarUrl: string | null
}

/// Reused as-is on both the public marketing Navbar (when a session exists)
/// and the authenticated (main) shell's topbar — one component, two
/// placements, no duplication.
export function NavUserMenu({ fullName, email, avatarUrl }: NavUserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Menu da conta"
          />
        }
      >
        <UserAvatar name={fullName} email={email} avatarUrl={avatarUrl} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{fullName ?? "Minha conta"}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/perfil" />}>
          <User className="size-4" />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
