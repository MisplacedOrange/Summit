"use client"

import Link from "next/link"
import { useAuth } from "./auth-context"

const FEATURES = [
  {
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2l2.09 6.26L20.18 9l-5 4.27L16.82 20 12 16.9 7.18 20l1.64-6.73L3.82 9l6.09-.74Z" />
      </svg>
    ),
    title: "AI-Powered Matching",
    desc: "Gemini AI ranks opportunities based on your interests, skills, availability, and location — so the best match is always on top.",
  },
  {
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 000 20M2 12h20" />
      </svg>
    ),
    title: "Live Impact Map",
    desc: "See color-coded pins, urgency indicators, and your real-time location on an interactive Leaflet map of your area.",
  },
  {
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
    ),
    title: "Smart Discovery",
    desc: "Filter by cause, location, and availability. Search across nonprofits, local orgs, and open web listings instantly.",
  },
  {
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v-2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: "Personalized Profiles",
    desc: "Save your preferences, track your matches, and get recommendations tailored to your volunteering goals.",
  },
]

const CAUSES = [
  { name: "Environment", color: "#059669" },
  { name: "Education", color: "#2563eb" },
  { name: "Healthcare", color: "#dc2626" },
  { name: "Community", color: "#ca8a04" },
  { name: "Animal Care", color: "#9333ea" },
  { name: "Arts & Culture", color: "#ec4899" },
]

const STATS = [
  { value: "100+", label: "Opportunities" },
  { value: "6", label: "Cause areas" },
  { value: "AI", label: "Powered matching" },
  { value: "Live", label: "Impact map" },
]

export default function LandingPage() {
  const { user } = useAuth()

  return (
    <main className="min-h-screen bg-[#F7F5F3] text-[#37322F]">
      {/* Nav */}
      <nav className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-5 md:px-6">
        <span className="text-lg font-semibold">Summit ImpactMatch</span>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/profile" className="text-sm font-medium hover:underline">
                Profile
              </Link>
              <Link
                href="/discover"
                className="rounded-full bg-[#37322F] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4A4340]"
              >
                Go to Dashboard
              </Link>
            </>
          ) : (
            <Link
              href="/discover"
              className="rounded-full bg-[#37322F] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4A4340]"
            >
              Get Started
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-[1100px] px-4 pt-12 pb-16 text-center md:px-6 md:pt-20 md:pb-24">
        <span className="inline-flex rounded-full border border-[#E5E1DD] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide">
          AI-Powered Volunteer Matching
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl md:text-6xl">
          Find meaningful volunteer hours with{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] italic">real local impact.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-[#605A57] md:text-lg">
          Discover opportunities from nonprofits, local businesses, and volunteer events in one place.
          Let AI match you to the causes that matter most.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/discover"
            className="rounded-full bg-[#37322F] px-7 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-[#4A4340] hover:shadow-xl"
          >
            Explore Opportunities
          </Link>
          <a
            href="#features"
            className="rounded-full border border-[#CFC7C1] px-7 py-3 text-sm font-medium transition-colors hover:bg-[#F3ECE5]"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-[#E5E1DD] bg-white/60 backdrop-blur">
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4 md:px-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-semibold md:text-3xl">{s.value}</p>
              <p className="mt-1 text-sm text-[#605A57]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-[1100px] px-4 py-16 md:px-6 md:py-24">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">
          Everything you need to make an impact
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[#605A57] md:text-base">
          From intelligent matching to interactive maps, ImpactMatch makes it effortless to find and track volunteer work.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[#E5E1DD] bg-white p-6 transition-shadow duration-200 hover:shadow-md"
            >
              <div className="inline-flex rounded-xl bg-[#F3ECE5] p-3 text-[#37322F]">{f.icon}</div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#605A57]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cause tags */}
      <section className="border-y border-[#E5E1DD] bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-[1100px] px-4 py-12 text-center md:px-6">
          <h2 className="text-xl font-semibold sm:text-2xl">Causes you can support</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {CAUSES.map((c) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-2 rounded-full border border-[#E5E1DD] bg-white px-4 py-2 text-sm font-medium"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1100px] px-4 py-16 text-center md:px-6 md:py-24">
        <div className="rounded-3xl border border-[#E5E1DD] bg-white p-8 shadow-sm md:p-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Ready to find your perfect volunteer match?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[#605A57] md:text-base">
            Join students and nonprofits already using ImpactMatch to connect, track, and grow real local impact.
          </p>
          <Link
            href="/discover"
            className="mt-6 inline-flex rounded-full bg-[#37322F] px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-[#4A4340] hover:shadow-xl"
          >
            Get Started — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E1DD] bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-6 md:px-6">
          <span className="text-sm font-medium text-[#605A57]">&copy; 2026 Summit ImpactMatch</span>
          <div className="flex gap-4 text-sm text-[#605A57]">
            <Link href="/discover" className="hover:underline">Discover</Link>
            <Link href="/profile" className="hover:underline">Profile</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
