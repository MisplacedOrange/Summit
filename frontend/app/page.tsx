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

      {/* MNTN-style Hero Section */}
      <section
        className="relative min-h-screen bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80')",
        }}
      >
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Content positioned bottom-left */}
        <div className="relative z-10 flex min-h-screen flex-col justify-end px-8 pb-24 md:px-16 lg:px-24">
          {/* Subtitle with decorative line */}
          <div className="flex items-center gap-4">
            <span className="h-[2px] w-12 bg-[#D4A853]" />
            <p
              className="text-sm uppercase tracking-widest"
              style={{ color: "#D4A853" }}
            >
              Lorem Ipsum Dolor
            </p>
          </div>

          {/* Main headline */}
          <h1
            className="mt-6 max-w-3xl text-4xl leading-tight text-white md:text-5xl lg:text-6xl"
            style={{
              fontFamily: "'Times New Roman', Times, serif",
              fontStyle: "italic",
            }}
          >
            Consectetur Adipiscing Elit
            <br />
            Sed Do Eiusmod Tempor!
          </h1>
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
