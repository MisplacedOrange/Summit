import Link from "next/link"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"

export default function SmartSearchPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f3] text-[#37322f]">
      <Header />

      <section className="mx-auto max-w-[1060px] px-4 py-16">
        <Link href="/features" className="text-sm text-[#605a57] hover:text-[#37322f]">
          ← Back to Features
        </Link>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Smart Search and Filtering</h1>
        <p className="mt-3 max-w-3xl text-[#605a57]">
          Search and filter opportunities by relevance, distance, time, and required skills to quickly find the right fit.
        </p>

        <div className="mt-10 rounded-lg border border-[#e0dedb] bg-white p-6">
          <h2 className="text-xl font-semibold">Filter Controls</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#605a57]">
            <li>Cause category and interests</li>
            <li>Distance radius and location preferences</li>
            <li>Availability windows</li>
            <li>Skill requirements</li>
            <li>Urgency and volunteer demand</li>
          </ul>
        </div>

        <div className="mt-4 rounded-lg border border-[#e0dedb] bg-white p-6">
          <h2 className="text-xl font-semibold">Ranking Logic</h2>
          <p className="mt-3 text-sm text-[#605a57]">
            Results are ranked by profile relevance, proximity, and demand so students can identify impactful options without endless scrolling.
          </p>
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
