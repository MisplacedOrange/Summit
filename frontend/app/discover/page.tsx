"use client"

import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Header } from "@/components/header"
import { useAuth } from "../auth-context"
import { mapOpportunityRead, type V1OpportunityRead } from "@/lib/utils"

const OpportunityMap = dynamic(() => import("@/components/opportunity-map"), { ssr: false, loading: () => <div className="flex h-[380px] items-center justify-center rounded-xl bg-[#F9F6F2]"><p className="text-sm text-[#999]">Loading map…</p></div> })

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
  match_pct: number
  match_reason: string
  latitude: number
  longitude: number
}

type V1ListResponse = { total: number; items: V1OpportunityRead[] }
type V1RecommendationResponse = { items: Array<{ opportunity: V1OpportunityRead; score: number }> }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000"
const MAP_OPPORTUNITY_LIMIT = 100
const LIST_OPPORTUNITY_LIMIT = 24

const CAUSE_OPTIONS = ["", "environment", "education", "healthcare", "community", "animal-care", "arts-culture"]

const CAUSE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  environment: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "#059669" },
  education: { bg: "bg-blue-100", text: "text-blue-700", dot: "#2563eb" },
  healthcare: { bg: "bg-red-100", text: "text-red-700", dot: "#dc2626" },
  community: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "#ca8a04" },
  "animal-care": { bg: "bg-purple-100", text: "text-purple-700", dot: "#9333ea" },
  "arts-culture": { bg: "bg-pink-100", text: "text-pink-700", dot: "#ec4899" },
}

function toLabel(value: string): string {
  if (!value) return "All causes"
  return value.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[#b9d5f7] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="h-5 w-3/5 rounded bg-[#b9d5f7]" />
        <div className="h-5 w-16 rounded-full bg-[#b9d5f7]" />
      </div>
      <div className="mt-2 h-4 w-2/5 rounded bg-[#EDE9E4]" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-[#EDE9E4]" />
        <div className="h-3 w-4/5 rounded bg-[#EDE9E4]" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-20 rounded-full bg-[#EDE9E4]" />
        <div className="h-6 w-16 rounded-full bg-[#EDE9E4]" />
        <div className="h-6 w-14 rounded-full bg-[#EDE9E4]" />
      </div>
      <div className="mt-4 h-8 w-32 rounded-full bg-[#b9d5f7]" />
    </div>
  )
}

function SkeletonStat() {
  return (
    <div className="animate-pulse rounded-xl border border-[#b9d5f7] bg-white p-4">
      <div className="h-3 w-20 rounded bg-[#EDE9E4]" />
      <div className="mt-2 h-7 w-10 rounded bg-[#b9d5f7]" />
    </div>
  )
}

function EmptyState({ isError, onRetry }: { isError?: boolean; onRetry: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <svg className="h-16 w-16 text-[#9ec4ef]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
      <h3 className="mt-4 text-lg font-semibold text-[#49423D]">
        {isError ? "Something went wrong" : "No opportunities found"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-[#4676aa]">
        {isError
          ? "We couldn\u2019t reach the server. Check your connection and try again."
          : "Try broadening your search, changing the cause filter, or adjusting your location."}
      </p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-full border border-[#9ec4ef] bg-white px-5 py-2 text-sm font-medium hover:bg-[#eaf4ff] transition-colors"
      >
        {isError ? "Retry" : "Reset & search"}
      </button>
    </div>
  )
}


export default function ImpactMatchPage() {
  const { user, token, loading: authLoading, login, logout } = useAuth()
  const router = useRouter()

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
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)

  const startWatchingLocation = useCallback(() => {
    if (!navigator.geolocation) return

    // Stop existing watcher if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now()
        // Throttle updates to at most once every 5 seconds
        if (now - lastUpdateRef.current < 5000) return
        lastUpdateRef.current = now
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {/* permission denied or error — keep null */},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
    )
  }, [])

  // Start watching on mount, clean up on unmount
  useEffect(() => {
    startWatchingLocation()
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [startWatchingLocation])

  // First-run gate: redirect new users with no preferences to onboarding
  useEffect(() => {
    if (!authLoading && user && user.preferences === null) {
      router.push("/onboarding/interests")
    }
  }, [authLoading, user, router])

  // Populate inputs from saved preferences when user logs in
  useEffect(() => {
    if (user?.preferences) {
      const p = user.preferences
      if (p.interests.length > 0) setInterestsInput(p.interests.join(", "))
      if (p.skills.length > 0) setSkillsInput(p.skills.join(", "))
    }
  }, [user])

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
    let result = remoteOnly ? items.filter((item) => /remote|virtual|online/i.test(item.description)) : items
    if (userCoords) {
      result = [...result].sort((a, b) => {
        const dA = (a.latitude - userCoords.lat) ** 2 + (a.longitude - userCoords.lng) ** 2
        const dB = (b.latitude - userCoords.lat) ** 2 + (b.longitude - userCoords.lng) ** 2
        return dA - dB
      })
    }
    return result
  }, [items, remoteOnly, userCoords])

  async function discoverOpportunities() {
    setLoading(true)
    setIsAiResult(false)
    setError(null)
    try {
      const url = new URL(`${API_BASE}/v1/opportunities`)
      url.searchParams.set("q", query)
      url.searchParams.set("limit", "16")
      if (cause) url.searchParams.set("category", cause)
      if (userCoords) {
        url.searchParams.set("lat", String(userCoords.lat))
        url.searchParams.set("lng", String(userCoords.lng))
      }

      const response = await fetch(url.toString())
      if (!response.ok) throw new Error(`Backend returned ${response.status}`)
      const data: V1ListResponse = await response.json()
      setItems(data.items.map((r) => mapOpportunityRead(r)))
      setSource("ImpactMatch v1")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  async function runAiMatch() {
    if (!token) {
      alert("Sign in to use AI matching")
      return
    }
    setLoading(true)
    setAiMatching(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/v1/recommendations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`Backend returned ${response.status}`)
      const data: V1RecommendationResponse = await response.json()
      const mapped = data.items.map((item) =>
        mapOpportunityRead(item.opportunity, Math.round(item.score * 100)),
      )
      setItems(mapped)
      setSource("AI Matched")
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


  return (
    <main className="min-h-screen bg-[#eef6ff] text-[#143d73]">
      <Header />





      <section className="mx-auto mt-4 max-w-[1100px] px-4 pb-16 md:px-6">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-[#b9d5f7] bg-white p-4">
            <h2 className="text-lg font-semibold">Smart discovery</h2>
            <p className="mt-1 text-sm text-[#4676aa]">Search and filter opportunities, then run AI matching for ranked results.</p>

            <div className="mt-4 grid gap-3">
              <input
                className="w-full rounded-md border border-[#b9d5f7] px-3 py-2 text-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search causes or opportunities"
              />

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="rounded-md border border-[#b9d5f7] px-3 py-2 text-sm"
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
                  className="rounded-md border border-[#b9d5f7] px-3 py-2 text-sm"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-md border border-[#b9d5f7] px-3 py-2 text-sm"
                  value={interestsInput}
                  onChange={(e) => setInterestsInput(e.target.value)}
                  placeholder="Interests: environment, education"
                />
                <input
                  className="rounded-md border border-[#b9d5f7] px-3 py-2 text-sm"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="Skills: social media, design"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  className="rounded-md border border-[#b9d5f7] px-3 py-2 text-sm"
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
                  className="rounded-full bg-[#2f6fd1] px-5 py-2 text-sm font-medium text-white"
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
                        : "border border-[#9ec4ef] bg-white hover:border-[#7ab3f2] hover:bg-[#edf7ff]"
                  }`}
                  disabled={loading || !token}
                  title={!token ? "Sign in to use AI matching" : undefined}
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
                <p className="text-xs text-[#4676aa]">
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

          <div className="rounded-2xl border border-[#b9d5f7] bg-white p-4">
            <h2 className="text-lg font-semibold">Local impact map</h2>
            <p className="mt-1 text-sm text-[#4676aa]">Color-coded pins show nearby opportunities and urgent needs. Click a pin for details.</p>
            <div className="mt-4 overflow-hidden rounded-xl border border-[#b9d5f7]">
              <OpportunityMap
                items={filteredItems.slice(0, MAP_OPPORTUNITY_LIMIT)}
                className="h-[380px] w-full"
                userLocation={userCoords}
                onLocateMe={startWatchingLocation}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#6C645F]">
              {Object.entries(CAUSE_COLORS).map(([cause, colors]) => (
                <span key={cause} className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/5" style={{ backgroundColor: colors.dot }} />
                  {toLabel(cause)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#b9d5f7] bg-white p-4">
          <h2 className="text-lg font-semibold">
            {isAiResult ? "AI-Matched opportunities" : "Opportunities"}
          </h2>
          <p className="mt-1 text-sm text-[#4676aa]">
            {isAiResult
              ? "Ranked by AI based on your interests, skills, and location."
              : "High-need local work and discovered listings from the open web."}
          </p>
          {filteredItems.length > LIST_OPPORTUNITY_LIMIT && (
            <p className="mt-2 text-xs text-[#6C645F]">
              Showing {LIST_OPPORTUNITY_LIMIT} cards below. The map still includes up to {Math.min(filteredItems.length, MAP_OPPORTUNITY_LIMIT)} opportunities.
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {loading && items.length === 0 ? (
              <>{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</>
            ) : filteredItems.length === 0 ? (
              <EmptyState isError={!!error} onRetry={() => void discoverOpportunities()} />
            ) : filteredItems.slice(0, LIST_OPPORTUNITY_LIMIT).map((item) => {
              const causeStyle = CAUSE_COLORS[item.cause] ?? { bg: "bg-gray-100", text: "text-gray-700", dot: "#6b7280" }
              return (
                <article key={item.id} className="rounded-xl border border-[#b9d5f7] p-4 transition-shadow duration-200 hover:shadow-md">
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
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${causeStyle.bg} ${causeStyle.text}`}>{toLabel(item.cause)}</span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-[#4676aa]">{item.organization}</p>
                  {isAiResult && item.match_reason && (
                    <p className="mt-1.5 text-xs italic text-purple-600">{item.match_reason}</p>
                  )}
                  <p className="mt-2 line-clamp-3 text-sm text-[#4676aa]">{item.description}</p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6B645E]">
                    <span className="rounded-full bg-[#F3ECE5] px-2 py-1">{item.location}</span>
                    <span className="rounded-full bg-[#F3ECE5] px-2 py-1">{item.schedule}</span>
                    <span className="rounded-full bg-[#F3ECE5] px-2 py-1">Need: {item.volunteers_needed}</span>
                    {isAiResult && item.match_pct > 0 && (
                      <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-700">{item.match_pct}%</span>
                    )}
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
                    className="mt-4 inline-flex rounded-full bg-[#2f6fd1] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#245cb0]"
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
