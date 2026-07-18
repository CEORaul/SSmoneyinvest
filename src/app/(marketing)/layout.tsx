import { Footer } from "@/components/layout/Footer"
import { Navbar } from "@/components/layout/Navbar"
import { getOptionalProfile } from "@/lib/auth/session"

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getOptionalProfile()

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar
        user={
          profile && {
            fullName: profile.fullName,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
          }
        }
      />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  )
}
