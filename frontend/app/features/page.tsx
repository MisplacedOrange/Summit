import Link from "next/link"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"

const features = [
  {
    id: "01",
    title: "AI-Powered Opportunity Matching",
    href: "/features/ai-matching",
    description:
      "Vector-based recommendations using interests, skills, availability, and location to rank opportunities.",
  },
  {
    id: "02",
    title: "Automated Volunteer Opportunity Discovery",
    href: "/features/automated-discovery",
    description:
      "Scraping + AI extraction pipeline discovers opportunities even when organizations do not manually sign up.",
  },
  {
    id: "03",
    title: "Geographic Opportunity Locator",
    href: "/features/local-impact-map",
    description:
      "Interactive map with color-coded causes and urgency markers to drive students toward real local impact.",
  },
  {
    id: "04",
    title: "Smart Search and Filtering",
    href: "/features/smart-search",
    description:
      "Filter by cause, distance, time, and skill requirements with relevance-first ranking logic.",
  },
]

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f3] text-[#37322f]">
      <Header />

      <section className="mx-auto max-w-[1060px] px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Summit Platform Features</h1>
        <p className="mt-3 max-w-2xl text-[#605a57]">
          Each core capability has its own page with implementation details and user impact.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="rounded-lg border border-[#e0dedb] bg-white p-6 transition hover:shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#7b736d]">Feature {feature.id}</p>
              <h2 className="mt-2 text-xl font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-[#605a57]">{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
