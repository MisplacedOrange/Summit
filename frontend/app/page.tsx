"use client"

import { useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
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

  const panelRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: panelRef, offset: ["start start", "end end"] })

  const headlineOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0])
  const missionOpacity = useTransform(scrollYProgress, [0.15, 0.35, 0.55], [0, 1, 1])
  const missionY = useTransform(scrollYProgress, [0.15, 0.35], [40, 0])
  const blackOpacity = useTransform(scrollYProgress, [0.77, 0.99], [0, 0.9])

  return (
    <main className="min-h-screen bg-[#061120] text-[#d9e9ff]">
      <Header />

      {/* Unified Hero + Transition — one section, one mountain image, one sticky viewport */}
      <section ref={panelRef} style={{ height: "300vh", position: "relative" }}>
        <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
          {/* Single mountain image */}
          <img
            src="/assets/images/mountain.webp"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

          {/* SUMMIT watermark */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-20 flex select-none flex-col items-center justify-center pb-[35vh]"
            style={{ opacity: headlineOpacity }}
          >
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
          </motion.div>

          {/* Headline — fades out as mission fades in */}
          <motion.div
            className="absolute bottom-0 left-0 z-30 px-8 pb-14 md:px-16 lg:px-24"
            style={{ opacity: headlineOpacity }}
          >
            <h1
              className="max-w-3xl text-4xl leading-tight text-white md:text-5xl lg:text-6xl"
              style={{ fontFamily: "'Times New Roman', Times, serif", fontStyle: "italic" }}
            >
              Climb Higher
              <br />
              Reach your <a href="/discover">SUMMIT</a>.
            </h1>
          </motion.div>

          {/* Mission statement — fades in bottom-left */}
          <motion.div
            className="pointer-events-none absolute bottom-0 left-0 z-30 px-8 pb-14 md:px-16 lg:px-24"
            style={{ opacity: missionOpacity, y: missionY }}
          >
            <p
              className="max-w-2xl text-lg leading-relaxed text-white md:text-xl"
              style={{ fontFamily: "'Times New Roman', Times, serif", fontStyle: "italic" }}
            >
              We believe every person has the power to create change. Summit connects volunteers with the opportunities that matter most — in their community, on their schedule, aligned with their passion.
            </p>
          </motion.div>

          {/* Black dissolve overlay */}
          <motion.div
            className="absolute inset-0 z-40 bg-black pointer-events-none"
            style={{ opacity: blackOpacity }}
          />
        </div>
      </section>

      {/* Feature image divider with caution tape */}
      <section id="caution-section" className="relative min-h-[480px] overflow-hidden">
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
                VOLUNTEER
              </span>
            ))}
          </div>
        </div>

        {/* Caution tape 2 — middle-left to top-right */}
        <div
          className="absolute z-10 overflow-hidden"
          style={{
            top: "16%",
            left: "-50%",
            width: "200%",
            transform: "translateY(-50%) rotate(-5deg)",
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
                SIGN-UP NOW
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="relative isolate border-y border-[#2a4e7a] bg-[#071a31]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(35,131,255,0.22),transparent_45%),radial-gradient(circle_at_84%_80%,rgba(0,219,168,0.15),transparent_40%),linear-gradient(180deg,#0b1f3a_0%,#071a31_100%)]" />
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4 md:px-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-semibold tracking-tight text-[#eef7ff] md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-[#79a5d6]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cause tags */}
      <section className="relative isolate border-y border-[#2b4f7a] bg-[#08182d]">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#0a1f3b_0%,#08182d_100%)]" />
        <div className="mx-auto max-w-[1100px] px-4 py-12 text-center md:px-6">
          <h2 className="text-xl font-semibold text-[#f1f8ff] sm:text-2xl">Causes you can support</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {CAUSES.map((c) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-2 rounded-full border border-[#3f648d] bg-[#0c2a4a] px-4 py-2 text-sm font-medium text-[#d9ecff]"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#284d78] bg-[#050e1b]">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-6 md:px-6">
          <span className="text-sm font-medium text-[#86afd8]">&copy; 2026 Summit ImpactMatch</span>
          <div className="flex gap-4 text-sm text-[#86afd8]">
            <Link href="/discover" className="hover:underline">Discover</Link>
            <Link href="/profile" className="hover:underline">Profile</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
