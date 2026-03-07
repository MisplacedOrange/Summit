import Link from "next/link"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"

const highlights = [
  {
    title: "AI Matching Engine",
    description:
      "Recommends opportunities based on interests, skills, availability, and location using embeddings and ranking.",
    href: "/features/ai-matching",
  },
  {
    title: "Automated Discovery",
    description: "Scrapes and structures volunteer opportunities so students can find options even without org signups.",
    href: "/features/automated-discovery",
  },
  {
    title: "Local Impact Map",
    description: "Visual map with cause-based pins and urgency indicators to surface nearby high-need opportunities.",
    href: "/features/local-impact-map",
  },
  {
    title: "Smart Search & Filters",
    description: "Find opportunities by cause, distance, schedule, and skill relevance in seconds.",
    href: "/features/smart-search",
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f5f3] text-[#37322f]">
      <Header />

      <section className="mx-auto max-w-[1060px] px-4 py-16">
        <p className="inline-flex rounded-full border border-[#e0dedb] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          Summit Volunteer Platform
        </p>

        <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
          Make volunteer discovery fast, meaningful, and aligned with student passion.
        </h1>

        <p className="mt-5 max-w-3xl text-base text-[#605a57] md:text-lg">
          Summit connects students to local businesses and nonprofits offering high-impact volunteer opportunities.
          Instead of mindless hours, students discover causes they care about, while organizations get reliable help.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="https://github.com/nix-life/Hack-Canada-2026"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#37322f] px-5 py-2 text-sm font-medium text-white hover:bg-[#2e2926]"
          >
            View GitHub Repo
          </a>
          <a
            href="https://github.com/nix-life/Hack-Canada-2026"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#d6d1cc] bg-white px-5 py-2 text-sm font-medium hover:bg-[#f3f0ed]"
          >
            Devpost Link
          </a>
        </div>
      </section>

      <section className="border-y border-[#e0dedb] bg-white/70">
        <div className="mx-auto grid max-w-[1060px] gap-4 px-4 py-10 md:grid-cols-2">
          <div className="rounded-lg border border-[#e0dedb] bg-white p-6">
            <h2 className="text-xl font-semibold">Problem</h2>
            <p className="mt-3 text-sm leading-6 text-[#605a57]">
              Students need volunteer hours but struggle to find opportunities that are relevant and interesting.
              At the same time, local organizations need volunteer support but are hard to discover.
            </p>
          </div>
          <div className="rounded-lg border border-[#e0dedb] bg-white p-6">
            <h2 className="text-xl font-semibold">Solution</h2>
            <p className="mt-3 text-sm leading-6 text-[#605a57]">
              Summit centralizes opportunity discovery with AI recommendations, automated scraping, and map-based local
              search so students can complete impactful hours faster.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1060px] px-4 py-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-semibold tracking-tight">Core Features</h2>
          <Link href="/features" className="text-sm font-medium text-[#605a57] hover:text-[#37322f]">
            View all feature pages
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {highlights.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg border border-[#e0dedb] bg-white p-5 hover:shadow-sm">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-[#605a57]">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-[#e0dedb] bg-white/70">
        <div className="mx-auto grid max-w-[1060px] gap-4 px-4 py-10 md:grid-cols-2">
          <div className="rounded-lg border border-[#e0dedb] bg-white p-6">
            <h2 className="text-xl font-semibold">Potential Tracks</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#605a57]">
              <li>Vultr (Deployment)</li>
              <li>Auth0 (Log-in)</li>
              <li>Gemini API (scraping + extraction accuracy)</li>
              <li>Google Antigravity (optional build tooling)</li>
            </ul>
          </div>
          <div className="rounded-lg border border-[#e0dedb] bg-white p-6">
            <h2 className="text-xl font-semibold">Tech Stack</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#605a57]">
              <li>Frontend: React + TypeScript (template-based Next.js site)</li>
              <li>Backend: Python (FastAPI / Django / Flask)</li>
              <li>Database: MongoDB</li>
              <li>Scraping: BeautifulSoup + AI extraction pipeline</li>
              <li>Deployment: Vultr</li>
            </ul>
          </div>
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
