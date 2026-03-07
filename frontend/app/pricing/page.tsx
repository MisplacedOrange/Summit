import CTASection from "@/components/cta-section"
import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"
import PricingSection from "@/components/pricing-section"

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f3] text-[#37322f]">
      <Header />
      <PricingSection />
      <CTASection />
      <FooterSection />
    </main>
  )
}
