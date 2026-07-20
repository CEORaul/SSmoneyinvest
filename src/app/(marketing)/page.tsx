import { BenefitsSection } from "@/features/home/components/BenefitsSection"
import { CtaSection } from "@/features/home/components/CtaSection"
import { Hero } from "@/features/home/components/Hero"
import { MarketMoversSection } from "@/features/home/components/MarketMoversSection"
import { MyPortfolioSection } from "@/features/home/components/MyPortfolioSection"
import { PopularCompaniesSection } from "@/features/home/components/PopularCompaniesSection"
import { getOptionalProfile } from "@/lib/auth/session"

export default async function HomePage() {
  const profile = await getOptionalProfile()
  const isAuthenticated = !!profile

  return (
    <>
      <Hero isAuthenticated={isAuthenticated} />
      {profile && <MyPortfolioSection profileId={profile.id} />}
      <MarketMoversSection />
      <BenefitsSection />
      <PopularCompaniesSection />
      <CtaSection isAuthenticated={isAuthenticated} />
    </>
  )
}
