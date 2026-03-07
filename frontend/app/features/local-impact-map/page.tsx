import Link from "next/link"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"

export default function LocalImpactMapPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f3] text-[#37322f]">
      <Header />

      <section className="mx-auto max-w-[1060px] px-4 py-16">
        <Link href="/features" className="text-sm text-[#605a57] hover:text-[#37322f]">
          ← Back to Features
        </Link>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Geographic Opportunity Locator</h1>
        <p className="mt-3 max-w-3xl text-[#605a57]">
          Students discover opportunities through an interactive local map with cause coloring, urgency indicators, and distance-aware filtering.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[#e0dedb] bg-white p-6">
            <h2 className="text-xl font-semibold">Map Features</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#605a57]">
              <li>Pins for nearby events and nonprofit opportunities.</li>
              <li>Cause color coding (environment, animal care, community, and more).</li>
              <li>Urgency highlighting for high-need volunteer requests.</li>
              <li>Click-to-open opportunity cards with join actions.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-[#e0dedb] bg-white p-6">
            <h2 className="text-xl font-semibold">Impact</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#605a57]">
              <li>Improves local volunteer engagement.</li>
              <li>Makes nearby opportunities obvious at a glance.</li>
              <li>Helps students choose meaningful, high-impact work.</li>
            </ul>
          </div>
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
