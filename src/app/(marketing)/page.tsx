import { BenefitsSection } from "@/features/home/components/BenefitsSection"
import { CtaSection } from "@/features/home/components/CtaSection"
import { Hero } from "@/features/home/components/Hero"
import { MarketMoversSection } from "@/features/home/components/MarketMoversSection"
import { PopularCompaniesSection } from "@/features/home/components/PopularCompaniesSection"

export default function HomePage() {
  return (
    <>
      <Hero />
      <MarketMoversSection />
      <BenefitsSection />
      <PopularCompaniesSection />
      <CtaSection />
    </>
  )
}
