import { BenefitsSection } from "@/features/home/components/BenefitsSection"
import { CtaSection } from "@/features/home/components/CtaSection"
import { Hero } from "@/features/home/components/Hero"
import { MarketMoversSection } from "@/features/home/components/MarketMoversSection"
import { MyPortfolioSection } from "@/features/home/components/MyPortfolioSection"
import { PopularCompaniesSection } from "@/features/home/components/PopularCompaniesSection"
import { getSearchDropdownDefaultsAction } from "@/features/search/actions"
import { getOptionalProfile } from "@/lib/auth/session"

export default async function HomePage() {
  const [profile, searchDefaults] = await Promise.all([
    getOptionalProfile(),
    getSearchDropdownDefaultsAction(),
  ])
  const isAuthenticated = !!profile

  return (
    <>
      <Hero isAuthenticated={isAuthenticated} initialSearchDefaults={searchDefaults} />
      {profile && <MyPortfolioSection profileId={profile.id} />}
      <MarketMoversSection />
      <BenefitsSection />
      <PopularCompaniesSection />
      <CtaSection isAuthenticated={isAuthenticated} />
    </>
  )
}
