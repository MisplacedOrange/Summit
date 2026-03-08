"use client"

import Image from "next/image"
import Link from "next/link"
import { useAuth } from "./auth-context"
import { Header } from "@/components/header"

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
    <main className="min-h-screen bg-[#eef6ff] text-[#143d73]">
      <Header />

      {/* Hero */}
      <section className="relative h-screen overflow-hidden">
        {/* Background image */}
        <img
          src="/assets/images/mountain.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />

        {/* Overlay — top for navbar readability, bottom for headline readability */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {/* SUMMIT — white, translucent, fades at bottom, above center */}
        <div className="pointer-events-none absolute inset-0 z-20 flex select-none flex-col items-center justify-center pb-[35vh]">
          <span
            className="block w-full text-center leading-none text-white opacity-20"
            style={{
              fontSize: "22vw",
              letterSpacing: "-0.04em",
              fontFamily: "sans-serif",
              fontWeight: 900,
              WebkitMaskImage: "linear-gradient(to bottom, black 30%, transparent 100%)",
              maskImage: "linear-gradient(to bottom, black 30%, transparent 100%)",
            }}
          >
            SUMMIT
          </span>
        </div>

        {/* Bottom-left headline */}
        <div className="absolute bottom-0 left-0 z-30 px-8 pb-14 md:px-16 lg:px-24">
          <h1
            className="max-w-3xl text-4xl leading-tight text-white md:text-5xl lg:text-6xl"
            style={{ fontFamily: "'Times New Roman', Times, serif", fontStyle: "italic" }}
          >
            Climb Higher
            <br />
            Reach your <b>SUMMIT</b>.
          </h1>
        </div>
      </section>

      {/* Feature image divider with caution tape */}
      <section className="relative min-h-[480px] overflow-hidden">
        {/* Full-width background image */}
        <img
          src="/assets/images/cabin.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-[50%_50%]"
        />
        <div className="absolute inset-0 bg-black/40" />

        {/* Feature 1 — bottom left */}
        <div className="absolute bottom-14 left-10 max-w-[38%] z-10">
          <div className="inline-flex rounded-xl bg-white/20 p-3 text-white backdrop-blur-sm">
            {FEATURES[0].icon}
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">{FEATURES[0].title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-white/80">{FEATURES[0].desc}</p>
        </div>

        {/* Feature 2 — top right */}
        <div className="absolute right-10 top-14 max-w-[38%] text-right z-10">
          <div className="inline-flex justify-end rounded-xl bg-white/20 p-3 text-white backdrop-blur-sm">
            {FEATURES[1].icon}
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">{FEATURES[1].title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-white/80">{FEATURES[1].desc}</p>
        </div>

        {/* Caution tape 1 — bottom-left to top-right */}
        <div
          className="absolute z-10 overflow-hidden"
          style={{
            top: "50%",
            left: "-50%",
            width: "200%",
            transform: "translateY(-50%) rotate(17deg)",
            height: "42px",
            background: "#FFD700",
            boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
          }}
        >
          <div className="animate-marquee flex h-full items-center whitespace-nowrap">
            {Array.from({ length: 30 }).map((_, i) => (
              <span
                key={i}
                style={{ fontFamily: "sans-serif", color: "#141414", padding: "0 1.5rem", lineHeight: "42px", display: "inline-block", fontWeight: 900, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.25em" }}
              >
                CAUTION
              </span>
            ))}
          </div>
        </div>

        {/* Caution tape 2 — middle-left to top-right */}
        <div
          className="absolute z-10 overflow-hidden"
          style={{
            top: "15%",
            left: "-50%",
            width: "200%",
            transform: "translateY(-50%) rotate(-12deg)",
            height: "42px",
            background: "#FFD700",
            boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
          }}
        >
          <div className="animate-marquee flex h-full items-center whitespace-nowrap">
            {Array.from({ length: 30 }).map((_, i) => (
              <span
                key={i}
                style={{ fontFamily: "sans-serif", color: "#141414", padding: "0 1.5rem", lineHeight: "42px", display: "inline-block", fontWeight: 900, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.25em" }}
              >
                CAUTION
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-[#9fc4ef] bg-gradient-to-r from-[#eff8ff] via-[#ffffff] to-[#ecfcff] backdrop-blur">
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4 md:px-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-semibold md:text-3xl">{s.value}</p>
              <p className="mt-1 text-sm text-[#4876aa]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>
      {/* Cause tags */}
      <section className="border-y border-[#c2daf8] bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-[1100px] px-4 py-12 text-center md:px-6">
          <h2 className="text-xl font-semibold sm:text-2xl">Causes you can support</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {CAUSES.map((c) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-2 rounded-full border border-[#c2daf8] bg-white px-4 py-2 text-sm font-medium"
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
        <div className="rounded-3xl border border-[#c2daf8] bg-white p-8 shadow-sm md:p-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Ready to find your perfect volunteer match?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[#4876aa] md:text-base">
            Join students and nonprofits already using ImpactMatch to connect, track, and grow real local impact.
          </p>
          <Link
            href="/discover"
            className="mt-6 inline-flex rounded-full bg-[#2f6fd1] px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-[#245cb0] hover:shadow-xl"
          >
            Get Started — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#c2daf8] bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-6 md:px-6">
          <span className="text-sm font-medium text-[#4876aa]">&copy; 2026 Summit ImpactMatch</span>
          <div className="flex gap-4 text-sm text-[#4876aa]">
            <Link href="/discover" className="hover:underline">Discover</Link>
            <Link href="/profile" className="hover:underline">Profile</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
