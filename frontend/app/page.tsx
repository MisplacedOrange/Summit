"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "./auth-context"

type Opportunity = {
  id: string
  title: string
  organization: string
  description: string
  url: string
  cause: string
  location: string
  schedule: string
  volunteers_needed: number
  skills: string[]
  urgency: "low" | "medium" | "high"
  score: number
  match_pct: number
  match_reason: string
  latitude: number
  longitude: number
}

type OpportunityResponse = {
  query: string
  count: number
  source: string
  items: Opportunity[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000"

const CAUSE_OPTIONS = ["", "environment", "education", "healthcare", "community", "animal-care", "arts-culture"]

const CAUSE_COLORS: Record<string, string> = {
  environment: "bg-emerald-100 text-emerald-700",
  education: "bg-blue-100 text-blue-700",
  healthcare: "bg-red-100 text-red-700",
  community: "bg-yellow-100 text-yellow-700",
  "animal-care": "bg-purple-100 text-purple-700",
  "arts-culture": "bg-pink-100 text-pink-700",
}

function toLabel(value: string): string {
  if (!value) return "All causes"
  return value.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
}

function normalizeToPercent(value: number, min: number, max: number): number {
  if (max <= min) return 50
  return ((value - min) / (max - min)) * 100
}

export default function ImpactMatchPage() {
  const { user, loading: authLoading, login, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginName, setLoginName] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loggingIn, setLoggingIn] = useState(false)

  const [query, setQuery] = useState("student volunteer opportunities Toronto")
  const [cause, setCause] = useState("")
  const [location, setLocation] = useState("Toronto")
  const [remoteOnly, setRemoteOnly] = useState(false)

  const [interestsInput, setInterestsInput] = useState("environment, community")
  const [skillsInput, setSkillsInput] = useState("social media, teaching")
  const [availability, setAvailability] = useState("weekends")

  const [items, setItems] = useState<Opportunity[]>([])
  const [source, setSource] = useState("")
  const [loading, setLoading] = useState(false)
  const [aiMatching, setAiMatching] = useState(false)
  const [isAiResult, setIsAiResult] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Populate inputs from saved preferences when user logs in
  useEffect(() => {
    if (user?.preferences) {
      const p = user.preferences
      if (p.interests.length > 0) setInterestsInput(p.interests.join(", "))
      if (p.skills.length > 0) setSkillsInput(p.skills.join(", "))
    }
  }, [user])

  async function handleLogin() {
    if (!loginEmail.trim()) { setLoginError("Email is required"); return }
    setLoggingIn(true)
    setLoginError("")
    try {
      await login(loginEmail.trim(), loginName.trim() || loginEmail.trim().split("@")[0])
      setShowLogin(false)
      setLoginEmail("")
      setLoginName("")
    } catch {
      setLoginError("Login failed. Please try again.")
    } finally {
      setLoggingIn(false)
    }
  }

  const stats = useMemo(() => {
    const totalNeeds = items.reduce((acc, item) => acc + item.volunteers_needed, 0)
    const highUrgency = items.filter((item) => item.urgency === "high").length
    const causes = new Set(items.map((item) => item.cause)).size
    return {
      opportunities: items.length,
      totalNeeds,
      highUrgency,
      causes,
    }
  }, [items])

  const filteredItems = useMemo(() => {
    if (!remoteOnly) return items
    return items.filter((item) => /remote|virtual|online/i.test(item.description))
  }, [items, remoteOnly])

  async function discoverOpportunities() {
    setLoading(true)
    setIsAiResult(false)
    setError(null)
    try {
      const interests = interestsInput
      const skills = skillsInput
      const url = new URL(`${API_BASE}/api/volunteer-organizations`)
      url.searchParams.set("q", query)
      url.searchParams.set("location", location)
      url.searchParams.set("limit", "16")
      if (cause) url.searchParams.set("cause", cause)
      if (interests) url.searchParams.set("interests", interests)
      if (skills) url.searchParams.set("skills", skills)

      const response = await fetch(url.toString())
      if (!response.ok) throw new Error(`Backend returned ${response.status}`)
      const data: OpportunityResponse = await response.json()
      setItems(data.items)
      setSource(data.source)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  async function runAiMatch() {
    setLoading(true)
    setAiMatching(true)
    setError(null)
    try {
      const payload = {
        interests: interestsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        skills: skillsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        availability,
        location,
        max_distance_km: 20,
        limit: 16,
      }

      const response = await fetch(`${API_BASE}/api/recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(`Backend returned ${response.status}`)
      const data: OpportunityResponse = await response.json()
      setItems(data.items)
      setSource(data.source)
      setIsAiResult(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
      setAiMatching(false)
    }
  }

  useEffect(() => {
    void discoverOpportunities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const latRange = useMemo(() => {
    if (!filteredItems.length) return { min: 43.6, max: 43.9 }
    return {
      min: Math.min(...filteredItems.map((x) => x.latitude)),
      max: Math.max(...filteredItems.map((x) => x.latitude)),
    }
  }, [filteredItems])

  const lonRange = useMemo(() => {
    if (!filteredItems.length) return { min: -79.55, max: -79.2 }
    return {
      min: Math.min(...filteredItems.map((x) => x.longitude)),
      max: Math.max(...filteredItems.map((x) => x.longitude)),
    }
  }, [filteredItems])

  return (
    <main className="min-h-screen bg-[#F7F5F3] text-[#37322F]">
      {/* Login modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#E5E1DD] bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Sign in to ImpactMatch</h2>
            <p className="mt-1 text-sm text-[#605A57]">Save your preferences and get personalized AI matches.</p>
            <div className="mt-4 grid gap-3">
              <input
                className="w-full rounded-md border border-[#D9D2CC] px-3 py-2 text-sm"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Email address"
                onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
              />
              <input
                className="w-full rounded-md border border-[#D9D2CC] px-3 py-2 text-sm"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="Full name (optional)"
                onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
              />
              {loginError && <p className="text-sm text-red-600">{loginError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => void handleLogin()}
                  disabled={loggingIn}
                  className="flex-1 rounded-full bg-[#37322F] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loggingIn ? "Signing in…" : "Sign in"}
                </button>
                <button
                  onClick={() => setShowLogin(false)}
                  className="rounded-full border border-[#CFC7C1] px-5 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-[1100px] px-4 py-10 md:px-6">
        <div className="rounded-3xl border border-[#E5E1DD] bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between">
            <p className="inline-flex rounded-full border border-[#E5E1DD] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              Summit ImpactMatch
            </p>
            {user ? (
              <div className="flex items-center gap-2">
                <a
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-full border border-[#E5E1DD] bg-white px-3 py-1.5 text-sm font-medium hover:bg-[#F3ECE5] transition-colors"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#37322F] text-[10px] font-bold text-white">
                    {user.full_name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
                  </span>
                  {user.full_name ?? user.email.split("@")[0]}
                </a>
                <button
                  onClick={logout}
                  className="rounded-full border border-[#CFC7C1] bg-white px-3 py-1.5 text-xs font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="rounded-full bg-[#37322F] px-4 py-1.5 text-sm font-medium text-white"
              >
                Sign in
              </button>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">
            Find meaningful volunteer hours with real local impact.
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-[#605A57] md:text-base">
            Discover opportunities from nonprofits, local businesses, and volunteer events in one place. Use AI matching
            to rank options by your interests, skills, availability, and location.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1100px] gap-4 px-4 md:grid-cols-4 md:px-6">
        <div className="rounded-xl border border-[#E5E1DD] bg-white p-4">
          <p className="text-xs text-[#605A57]">Opportunities</p>
          <p className="text-2xl font-semibold">{stats.opportunities}</p>
        </div>
        <div className="rounded-xl border border-[#E5E1DD] bg-white p-4">
          <p className="text-xs text-[#605A57]">Volunteer spots needed</p>
          <p className="text-2xl font-semibold">{stats.totalNeeds}</p>
        </div>
        <div className="rounded-xl border border-[#E5E1DD] bg-white p-4">
          <p className="text-xs text-[#605A57]">High urgency needs</p>
          <p className="text-2xl font-semibold">{stats.highUrgency}</p>
        </div>
        <div className="rounded-xl border border-[#E5E1DD] bg-white p-4">
          <p className="text-xs text-[#605A57]">Cause categories</p>
          <p className="text-2xl font-semibold">{stats.causes}</p>
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-[1100px] px-4 pb-16 md:px-6">
        <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-[#E5E1DD] bg-white p-4">
            <h2 className="text-lg font-semibold">Smart discovery</h2>
            <p className="mt-1 text-sm text-[#605A57]">Search and filter opportunities, then run AI matching for ranked results.</p>

            <div className="mt-4 grid gap-3">
              <input
                className="w-full rounded-md border border-[#D9D2CC] px-3 py-2 text-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search causes or opportunities"
              />

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="rounded-md border border-[#D9D2CC] px-3 py-2 text-sm"
                  value={cause}
                  onChange={(e) => setCause(e.target.value)}
                >
                  {CAUSE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toLabel(option)}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-md border border-[#D9D2CC] px-3 py-2 text-sm"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-md border border-[#D9D2CC] px-3 py-2 text-sm"
                  value={interestsInput}
                  onChange={(e) => setInterestsInput(e.target.value)}
                  placeholder="Interests: environment, education"
                />
                <input
                  className="rounded-md border border-[#D9D2CC] px-3 py-2 text-sm"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="Skills: social media, design"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  className="rounded-md border border-[#D9D2CC] px-3 py-2 text-sm"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                >
                  <option value="weekends">Weekends</option>
                  <option value="weekdays-evenings">Weekday evenings</option>
                  <option value="anytime">Anytime</option>
                </select>

                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} />
                  Remote only
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => void discoverOpportunities()}
                  className="rounded-full bg-[#37322F] px-5 py-2 text-sm font-medium text-white"
                  disabled={loading}
                >
                  {loading && !aiMatching ? "Loading..." : "Discover opportunities"}
                </button>
                <button
                  onClick={() => void runAiMatch()}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                    aiMatching
                      ? "border border-purple-400 bg-purple-50 text-purple-700"
                      : isAiResult
                        ? "border border-purple-300 bg-purple-50 text-purple-700"
                        : "border border-[#CFC7C1] bg-white hover:border-purple-300 hover:bg-purple-50"
                  }`}
                  disabled={loading}
                >
                  {aiMatching ? (
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Matching...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l2.09 6.26L20.18 9l-5 4.27L16.82 20 12 16.9 7.18 20l1.64-6.73L3.82 9l6.09-.74Z" />
                      </svg>
                      AI match me
                    </span>
                  )}
                </button>
              </div>

              {user?.preferences && user.preferences.interests.length > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Using your saved preferences.{" "}
                  <a href="/profile" className="underline hover:text-emerald-700">Edit</a>
                </p>
              )}

              {source && (
                <p className="text-xs text-[#7D756F]">
                  {isAiResult && (
                    <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l2.09 6.26L20.18 9l-5 4.27L16.82 20 12 16.9 7.18 20l1.64-6.73L3.82 9l6.09-.74Z" />
                      </svg>
                      AI Ranked
                    </span>
                  )}
                  Source: {source}
                </p>
              )}
              {error && <p className="text-sm text-red-700">Could not fetch opportunities: {error}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E1DD] bg-white p-4">
            <h2 className="text-lg font-semibold">Local impact map</h2>
            <p className="mt-1 text-sm text-[#605A57]">Color-coded pins show nearby opportunities and urgent needs.</p>
            <div className="relative mt-4 h-[380px] overflow-hidden rounded-xl border border-[#ECE7E2] bg-gradient-to-b from-[#F9F6F2] to-[#EFE8DF]">
              {filteredItems.slice(0, 20).map((item) => {
                const x = normalizeToPercent(item.longitude, lonRange.min, lonRange.max)
                const y = 100 - normalizeToPercent(item.latitude, latRange.min, latRange.max)
                const colorClass = CAUSE_COLORS[item.cause] ?? "bg-gray-100 text-gray-700"
                return (
                  <div
                    key={item.id}
                    className="group absolute"
                    style={{ left: `${Math.max(2, Math.min(95, x))}%`, top: `${Math.max(2, Math.min(95, y))}%` }}
                  >
                    <span className="block h-3 w-3 rounded-full bg-[#37322F] ring-4 ring-white/70" />
                    <div className="pointer-events-none absolute left-3 top-3 hidden w-56 rounded-lg border border-[#D8D0C8] bg-white p-2 text-xs shadow-lg group-hover:block">
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-[#6C645F]">{item.organization}</p>
                      <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}>
                        {toLabel(item.cause)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#E5E1DD] bg-white p-4">
          <h2 className="text-lg font-semibold">
            {isAiResult ? "AI-Matched opportunities" : "Opportunities"}
          </h2>
          <p className="mt-1 text-sm text-[#605A57]">
            {isAiResult
              ? "Ranked by AI based on your interests, skills, and location."
              : "High-need local work and discovered listings from the open web."}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filteredItems.map((item) => {
              const colorClass = CAUSE_COLORS[item.cause] ?? "bg-gray-100 text-gray-700"
              return (
                <article key={item.id} className="rounded-xl border border-[#E7E1DA] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold leading-tight">{item.title}</h3>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isAiResult && item.match_pct > 0 && (
                        <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                          item.match_pct >= 70 ? "bg-emerald-100 text-emerald-700" :
                          item.match_pct >= 45 ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {item.match_pct}% match
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${colorClass}`}>{toLabel(item.cause)}</span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-[#625B56]">{item.organization}</p>
                  {isAiResult && item.match_reason && (
                    <p className="mt-1.5 text-xs italic text-purple-600">{item.match_reason}</p>
                  )}
                  <p className="mt-2 line-clamp-3 text-sm text-[#625B56]">{item.description}</p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6B645E]">
                    <span className="rounded-full bg-[#F3ECE5] px-2 py-1">{item.location}</span>
                    <span className="rounded-full bg-[#F3ECE5] px-2 py-1">{item.schedule}</span>
                    <span className="rounded-full bg-[#F3ECE5] px-2 py-1">Need: {item.volunteers_needed}</span>
                    {isAiResult
                      ? <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-700">{item.match_pct}%</span>
                      : <span className="rounded-full bg-[#F3ECE5] px-2 py-1">Score: {item.score.toFixed(1)}</span>
                    }
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.skills.slice(0, 4).map((skill) => (
                      <span key={skill} className="rounded-full border border-[#D9D1CA] px-2 py-1 text-[11px]">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex rounded-full bg-[#37322F] px-4 py-2 text-xs font-medium text-white"
                  >
                    View opportunity
                  </a>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
