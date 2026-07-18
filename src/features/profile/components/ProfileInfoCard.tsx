import type { User } from "@supabase/supabase-js"
import { CheckCircle2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/shared/UserAvatar"

interface ProfileInfoCardProps {
  profile: {
    fullName: string | null
    email: string
    avatarUrl: string | null
    createdAt: Date
  }
  user: User
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export function ProfileInfoCard({ profile, user }: ProfileInfoCardProps) {
  const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null
  const isEmailVerified = Boolean(user.email_confirmed_at)

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <UserAvatar
          name={profile.fullName}
          email={profile.email}
          avatarUrl={profile.avatarUrl}
          size="lg"
        />
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold">
              {profile.fullName ?? "Sem nome cadastrado"}
            </p>
            {isEmailVerified ? (
              <Badge variant="outline" className="gap-1 border-gain/30 text-gain">
                <CheckCircle2 className="size-3" />
                Email verificado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Email não verificado
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
            <p>
              Membro desde{" "}
              <span className="text-foreground">{dateFormatter.format(profile.createdAt)}</span>
            </p>
            {lastSignInAt && (
              <p>
                Último acesso{" "}
                <span className="text-foreground">
                  {dateTimeFormatter.format(lastSignInAt)}
                </span>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
