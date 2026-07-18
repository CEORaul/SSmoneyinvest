import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserAvatarProps {
  name?: string | null
  email: string
  avatarUrl?: string | null
  size?: "default" | "sm" | "lg"
}

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const [first, second] = name.trim().split(/\s+/)
    return (first[0] + (second?.[0] ?? "")).toUpperCase()
  }
  return email[0]?.toUpperCase() ?? "?"
}

export function UserAvatar({ name, email, avatarUrl, size = "default" }: UserAvatarProps) {
  return (
    <Avatar size={size}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name ?? email} />}
      <AvatarFallback>{getInitials(name, email)}</AvatarFallback>
    </Avatar>
  )
}
