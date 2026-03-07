import Link from "next/link"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"

export default function AutomatedDiscoveryPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f3] text-[#37322f]">
      <Header />

      <section className="mx-auto max-w-[1060px] px-4 py-16">
        <Link href="/features" className="text-sm text-[#605a57] hover:text-[#37322f]">
          ← Back to Features
        </Link>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Automated Volunteer Opportunity Discovery</h1>
        <p className="mt-3 max-w-3xl text-[#605a57]">
          Summit solves the cold start problem by discovering opportunities from public listings without requiring manual organization onboarding.
        </p>

        <div className="mt-10 rounded-lg border border-[#e0dedb] bg-white p-6">
          <h2 className="text-xl font-semibold">Discovery Pipeline</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[#605a57]">
            <li>Scrapers collect volunteer posts from nonprofit and community pages.</li>
            <li>AI extracts structured fields from raw page text.</li>
            <li>Opportunities are categorized, scored, and stored in the database.</li>
            <li>New opportunities appear in map, search, and recommendation views.</li>
          </ol>
        </div>

        <div className="mt-4 rounded-lg border border-[#e0dedb] bg-white p-6">
          <h2 className="text-xl font-semibold">Extracted Fields</h2>
          <p className="mt-3 text-sm text-[#605a57]">
            Title, organization, description, location, date/time, cause category, volunteer demand, and skill requirements.
          </p>
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
