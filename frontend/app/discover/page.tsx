"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Header } from "@/components/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth, type UserPreferences } from "../auth-context"
import { mapOpportunityRead, type V1OpportunityRead } from "@/lib/utils"

const OpportunityMap = dynamic(() => import("@/components/opportunity-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[380px] items-center justify-center rounded-xl bg-[#0d2744]">
      <p className="text-sm text-[#9cc1e4]">Loading map…</p>
    </div>
  ),
})

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
type V1RecommendationResponse = { items: Array<{ opportunity: V1OpportunityRead; score: number; reason?: string }> }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000"
const MAP_OPPORTUNITY_LIMIT = 100
const LIST_OPPORTUNITY_LIMIT = 24
const DISCOVER_FETCH_LIMIT = 100

const CAUSE_OPTIONS = ["", "environment", "education", "healthcare", "community", "animal-care", "arts-culture"]
const INTEREST_SUGGESTIONS = [
  "environment",
  "education",
  "healthcare",
  "community",
  "animal-care",
  "arts-culture",
  "mentorship",
  "food security",
  "seniors",
  "youth leadership",
  "sports",
  "technology",
]
const GEOGRAPHY_OPTIONS = [
  { value: "all", label: "All places" },
  { value: "nearby", label: "Nearby" },
  { value: "map-ready", label: "Has map pin" },
  { value: "remote", label: "Remote or virtual" },
] as const

const CAUSE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  environment: { bg: "bg-emerald-500/20", text: "text-emerald-200", dot: "#10b981" },
  education: { bg: "bg-blue-500/20", text: "text-blue-200", dot: "#3b82f6" },
  healthcare: { bg: "bg-rose-500/20", text: "text-rose-200", dot: "#f43f5e" },
  community: { bg: "bg-amber-500/20", text: "text-amber-200", dot: "#f59e0b" },
  "animal-care": { bg: "bg-violet-500/20", text: "text-violet-200", dot: "#a78bfa" },
  "arts-culture": { bg: "bg-fuchsia-500/20", text: "text-fuchsia-200", dot: "#e879f9" },
}

function toLabel(value: string): string {
  if (!value) return "All causes"
  return value.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase()
}

const SUPPORTED_CAUSES = CAUSE_OPTIONS.filter(Boolean).map(normalizeTag)

function getInterestButtonClasses(interest: string, active: boolean): string {
  const normalizedInterest = normalizeTag(interest)
  const palette = CAUSE_COLORS[normalizedInterest]
  if (palette) {
    return active
      ? `border-transparent ${palette.bg} ${palette.text}`
      : `border-[#3d6188] bg-[#153d64] ${palette.text} hover:${palette.bg}`
  }

  return active
    ? "border-[#65b2ff] bg-[#1e4f7e] text-[#e7f2ff]"
    : "border-[#3d6188] bg-[#163d64] text-[#9ec4eb] hover:bg-[#1c4c79]"
}

function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => normalizeTag(entry))
        .filter(Boolean),
    ),
  )
}

function toggleTag(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

function hasCoordinates(item: Opportunity): boolean {
  return Number.isFinite(item.latitude) && Number.isFinite(item.longitude) && !(item.latitude === 0 && item.longitude === 0)
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a))
}

function matchesInterestFilters(item: Opportunity, filters: string[]): boolean {
  if (filters.length === 0) return true
  const normalizedCause = normalizeTag(item.cause)
  const categoryFilters = filters.filter((filter) => SUPPORTED_CAUSES.includes(normalizeTag(filter)))
  if (categoryFilters.length > 0) {
    return categoryFilters.includes(normalizedCause)
  }
  const haystack = [item.title, item.description, item.cause, item.location, ...item.skills]
    .join(" ")
    .toLowerCase()
  return filters.some((filter) => haystack.includes(filter))
}

function matchesSearchQuery(item: Opportunity, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  const terms = normalizedQuery.split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true

  const haystack = [
    item.title,
    item.organization,
    item.description,
    item.cause,
    item.location,
    item.schedule,
    ...item.skills,
  ]
    .join(" ")
    .toLowerCase()

  return terms.every((term) => haystack.includes(term))
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[#315781] bg-[#0d2949] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="h-5 w-3/5 rounded bg-[#20456f]" />
        <div className="h-5 w-16 rounded-full bg-[#20456f]" />
      </div>
      <div className="mt-2 h-4 w-2/5 rounded bg-[#EDE9E4]" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-[#23486f]" />
        <div className="h-3 w-4/5 rounded bg-[#23486f]" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-20 rounded-full bg-[#23486f]" />
        <div className="h-6 w-16 rounded-full bg-[#23486f]" />
        <div className="h-6 w-14 rounded-full bg-[#23486f]" />
      </div>
      <div className="mt-4 h-8 w-32 rounded-full bg-[#2f6fd1]" />
    </div>
  )
}

function EmptyState({ isError, onRetry }: { isError?: boolean; onRetry: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <svg className="h-16 w-16 text-[#9ec4ef]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
      <h3 className="mt-4 text-lg font-semibold text-[#e6f2ff]">
        {isError ? "Something went wrong" : "No opportunities found"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-[#8fb8df]">
        {isError
          ? "We couldn\u2019t reach the server. Check your connection and try again."
          : "Try broadening your search, changing the cause filter, or adjusting your location."}
      </p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-full border border-[#3a628e] bg-[#0f2d4e] px-5 py-2 text-sm font-medium text-[#d8ebff] transition-colors hover:bg-[#163b62]"
      >
        {isError ? "Retry" : "Reset & search"}
      </button>
    </div>
  )
}

function OpportunityMiniMap({
  latitude,
  longitude,
  title,
  className,
}: {
  latitude: number
  longitude: number
  title: string
  className?: string
}) {
  const latMin = latitude - 0.01
  const latMax = latitude + 0.01
  const lngMin = longitude - 0.015
  const lngMax = longitude + 0.015
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lngMin}%2C${latMin}%2C${lngMax}%2C${latMax}&layer=mapnik&marker=${latitude}%2C${longitude}`

  return (
    <iframe
      title={`Map preview for ${title}`}
      src={src}
      className={className ?? "h-[150px] w-full"}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  )
}

function SearchHeaderSection({
  loading,
  isAiResult,
  query,
  setQuery,
  cause,
  setCause,
  geography,
  setGeography,
  startWatchingLocation,
  userCoords,
  availableInterestFilters,
  selectedInterestFilters,
  setSelectedInterestFilters,
  discoverOpportunities,
  source,
  error,
}: {
  loading: boolean
  isAiResult: boolean
  query: string
  setQuery: (value: string) => void
  cause: string
  setCause: (value: string) => void
  geography: (typeof GEOGRAPHY_OPTIONS)[number]["value"]
  setGeography: (value: (typeof GEOGRAPHY_OPTIONS)[number]["value"]) => void
  startWatchingLocation: () => void
  userCoords: { lat: number; lng: number } | null
  availableInterestFilters: string[]
  selectedInterestFilters: string[]
  setSelectedInterestFilters: React.Dispatch<React.SetStateAction<string[]>>
  discoverOpportunities: () => Promise<void>
  source: string
  error: string | null
}) {
  const geographyLabel = GEOGRAPHY_OPTIONS.find((option) => option.value === geography)?.label ?? "All places"
  const [openPanel, setOpenPanel] = useState<"location" | "themes" | null>(null)

  return (
    <section className="sticky top-16 isolate z-[80] border-y border-[#2f547d]/80 bg-[#071a31]/80 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1680px] px-4 py-3 md:px-6 xl:px-8">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="relative min-w-[320px] flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#6f9bca]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </span>
              <input
                type="search"
                className="h-11 w-full rounded-full border border-[#3c648f] bg-[#0f3258]/95 px-11 pr-16 text-sm text-[#e4f2ff] outline-none transition-all placeholder:text-[#78a2cf] focus:border-[#48a3ff] focus:ring-2 focus:ring-[#48a3ff]/20"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search opportunities"
                aria-label="Search opportunities"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-xs font-medium text-[#9dc2e6] transition-colors hover:text-[#e4f2ff]"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setOpenPanel((current) => (current === "location" ? null : "location"))}
                className={`rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors ${
                  openPanel === "location"
                    ? "border-[#48a3ff]/60 bg-[#1d4b78] text-[#dff0ff]"
                    : "border-[#3e648d] bg-[#103558]/80 text-[#d7ebff] hover:bg-[#184268]"
                }`}
                aria-expanded={openPanel === "location"}
              >
                Location: {geographyLabel}
              </button>
              {openPanel === "location" && (
                <div className="absolute left-0 top-[calc(100%+10px)] z-[80] w-64 rounded-2xl border border-[#3d6188] bg-[#0d2f52]/95 p-3 shadow-xl backdrop-blur-xl">
                <div className="grid gap-2">
                  {GEOGRAPHY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setGeography(option.value)
                        setOpenPanel(null)
                      }}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        geography === option.value
                          ? "border-[#48a3ff]/60 bg-[#1d4b78] text-[#dff0ff]"
                          : "border-[#3d6188] bg-[#153d64] text-[#9dc2e6] hover:bg-[#1a476f]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    startWatchingLocation()
                    setOpenPanel(null)
                  }}
                  className="mt-3 w-full rounded-xl border border-[#3d6188] bg-[#163f66] px-3 py-2 text-sm font-medium text-[#a5d4ff] transition-colors hover:bg-[#1c4e7d]"
                >
                  {userCoords ? "Refresh live location" : "Use live location"}
                </button>
              </div>
              )}
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setOpenPanel((current) => (current === "themes" ? null : "themes"))}
                className={`rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors ${
                  openPanel === "themes"
                    ? "border-[#48a3ff]/60 bg-[#1d4b78] text-[#dff0ff]"
                    : "border-[#3e648d] bg-[#103558]/80 text-[#d7ebff] hover:bg-[#184268]"
                }`}
                aria-expanded={openPanel === "themes"}
              >
                Themes{selectedInterestFilters.length ? `: ${selectedInterestFilters.length}` : ""}
              </button>
              {openPanel === "themes" && (
                <div className="absolute left-0 top-[calc(100%+10px)] z-[80] w-[320px] rounded-2xl border border-[#3d6188] bg-[#0d2f52]/95 p-3 shadow-xl backdrop-blur-xl">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8bb3dc]">Themes</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInterestFilters([])
                      setOpenPanel(null)
                    }}
                    className="text-xs font-medium text-[#95bfe7] hover:text-[#e4f2ff]"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableInterestFilters.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => setSelectedInterestFilters((current) => toggleTag(current, interest))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${getInterestButtonClasses(
                        interest,
                        selectedInterestFilters.includes(interest),
                      )}`}
                    >
                      {toLabel(interest)}
                    </button>
                  ))}
                </div>
              </div>
              )}
            </div>

            <button
              onClick={() => void discoverOpportunities()}
              className="shrink-0 rounded-full border border-[#2f78d4]/50 bg-[#19416c] px-4 py-2 text-sm font-medium text-[#d7ebff] transition-colors hover:bg-[#245585]"
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {error && <p className="mt-2 px-1 text-sm text-rose-300">Could not fetch opportunities: {error}</p>}
      </div>
    </section>
  )
}

function RecommendationProfileCard({
  profileInterests,
  setProfileInterests,
  customInterest,
  setCustomInterest,
  addCustomInterest,
  profileSkills,
  setProfileSkills,
  startWatchingLocation,
  userCoords,
  saveRecommendationProfile,
  savingProfile,
  user,
  profileSaved,
}: {
  profileInterests: string[]
  setProfileInterests: React.Dispatch<React.SetStateAction<string[]>>
  customInterest: string
  setCustomInterest: (value: string) => void
  addCustomInterest: () => void
  profileSkills: string
  setProfileSkills: (value: string) => void
  startWatchingLocation: () => void
  userCoords: { lat: number; lng: number } | null
  saveRecommendationProfile: () => Promise<void>
  savingProfile: boolean
  user: { preferences?: { interests: string[] } | null } | null
  profileSaved: boolean
}) {
  return (
    <div className="rounded-2xl border border-[#315781] bg-[linear-gradient(145deg,rgba(13,42,72,0.98),rgba(9,29,53,0.95))] p-4 shadow-[0_16px_38px_rgba(0,0,0,0.3)]">
      <h2 className="text-lg font-semibold text-[#e7f2ff]">Recommendation profile</h2>
      <p className="mt-1 text-sm text-[#8bb3dc]">Choose interests to preview matching opportunities now, then save them to use the same preferences for AI matching later.</p>

      <div className="mt-4 grid gap-4">
        <div>
          <label className="text-sm font-medium text-[#d5e9ff]">Interest areas</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTEREST_SUGGESTIONS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => setProfileInterests((current) => toggleTag(current, interest))}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${getInterestButtonClasses(
                  interest,
                  profileInterests.includes(interest),
                )}`}
              >
                {toLabel(interest)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_auto]">
          <input
            className="rounded-md border border-[#3d6188] bg-[#123456] px-3 py-2 text-sm text-[#e4f2ff]"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addCustomInterest()
              }
            }}
            placeholder="Add a custom interest like food security or coding"
          />
          <button
            type="button"
            onClick={addCustomInterest}
            className="rounded-md border border-[#3d6188] bg-[#153d64] px-4 py-2 text-sm font-medium text-[#b1d8ff] hover:bg-[#1a476f]"
          >
            Add interest
          </button>
        </div>

        {profileInterests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profileInterests.map((interest) => (
              <span key={interest} className="inline-flex items-center gap-1 rounded-full bg-[#1f4f7f] px-3 py-1 text-xs font-medium text-[#e7f2ff]">
                {toLabel(interest)}
                <button
                  type="button"
                  onClick={() => setProfileInterests((current) => current.filter((entry) => entry !== interest))}
                  className="opacity-75 hover:opacity-100"
                  aria-label={`Remove ${interest}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-[#d5e9ff]">Skills you can offer</label>
          <input
            className="mt-1 w-full rounded-md border border-[#3d6188] bg-[#123456] px-3 py-2 text-sm text-[#e4f2ff]"
            value={profileSkills}
            onChange={(e) => setProfileSkills(e.target.value)}
            placeholder="teaching, event planning, social media, design"
          />
        </div>

        <div className="rounded-xl border border-[#3b6088] bg-[#0f3154] p-3 text-sm text-[#8bb3dc]">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={startWatchingLocation}
              className="rounded-full border border-[#3d6188] bg-[#163d64] px-3 py-1.5 text-xs font-medium text-[#b1d8ff] hover:bg-[#1a476f]"
            >
              {userCoords ? "Refresh location" : "Allow location"}
            </button>
            <span>
              {userCoords
                ? `Location saved from browser: ${userCoords.lat.toFixed(3)}, ${userCoords.lng.toFixed(3)}`
                : "No location saved yet. Add it to improve nearby recommendations."}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void saveRecommendationProfile()}
            disabled={savingProfile}
            className="rounded-full bg-[linear-gradient(135deg,#2ed3ff,#2f6fd1)] px-5 py-2 text-sm font-medium text-white shadow-[0_8px_24px_rgba(27,126,225,0.4)] disabled:opacity-60"
          >
            {savingProfile ? "Saving..." : user ? "Save recommendation profile" : "Sign in to save profile"}
          </button>
        </div>

        {profileSaved && (
          <p className="text-sm text-emerald-300">Recommendation profile saved. AI match will use these preferences now.</p>
        )}

        {user?.preferences && user.preferences.interests.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-300">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Using your saved preferences. <a href="/profile" className="underline hover:text-emerald-200">Edit full profile</a>
          </p>
        )}
      </div>
    </div>
  )
}

function LocalImpactMapCard({
  filteredItems,
  userCoords,
  startWatchingLocation,
}: {
  filteredItems: Opportunity[]
  userCoords: { lat: number; lng: number } | null
  startWatchingLocation: () => void
}) {
  return (
    <div className="rounded-2xl border border-[#315781] bg-[linear-gradient(145deg,rgba(13,42,72,0.98),rgba(9,29,53,0.95))] p-4">
      <h2 className="text-lg font-semibold text-[#e7f2ff]">Local impact map</h2>
      <p className="mt-1 text-sm text-[#8bb3dc]">Color-coded pins show nearby opportunities and urgent needs. Click a pin for details.</p>
      <div className="mt-4 overflow-hidden rounded-xl border border-[#315781]">
        <OpportunityMap
          items={filteredItems.slice(0, MAP_OPPORTUNITY_LIMIT)}
          className="h-[520px] w-full"
          userLocation={userCoords}
          onLocateMe={startWatchingLocation}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#9ec4eb]">
        {Object.entries(CAUSE_COLORS).map(([cause, colors]) => (
          <span key={cause} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/5" style={{ backgroundColor: colors.dot }} />
            {toLabel(cause)}
          </span>
        ))}
      </div>
    </div>
  )
}

function OpportunityCard({ item, isAiResult }: { item: Opportunity; isAiResult: boolean }) {
  const causeStyle = CAUSE_COLORS[item.cause] ?? { bg: "bg-gray-100", text: "text-gray-700", dot: "#6b7280" }

  return (
    <article className="rounded-xl border border-[#315781] bg-[linear-gradient(145deg,rgba(13,42,72,0.98),rgba(9,29,53,0.95))] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.28)] transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold leading-tight text-[#e7f2ff]">{item.title}</h3>
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

      <p className="mt-1 text-sm text-[#8bb3dc]">{item.organization}</p>
      {isAiResult && item.match_reason && <p className="mt-1.5 text-xs italic text-violet-200">{item.match_reason}</p>}
      <p className="mt-2 line-clamp-3 text-sm text-[#9ec4eb]">{item.description}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#b8d5f3]">
        <span className="rounded-full bg-[#153d64] px-2 py-1">{item.location}</span>
        <span className="rounded-full bg-[#153d64] px-2 py-1">{item.schedule}</span>
        <span className="rounded-full bg-[#153d64] px-2 py-1">Need: {item.volunteers_needed}</span>
        {isAiResult && item.match_pct > 0 && <span className="rounded-full bg-violet-500/25 px-2 py-1 text-violet-200">{item.match_pct}%</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {item.skills.slice(0, 4).map((skill) => (
          <span key={skill} className="rounded-full border border-[#3d6188] bg-[#0f3154] px-2 py-1 text-[11px] text-[#b8d5f3]">
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[#315781] bg-[#0f3154]">
        {hasCoordinates(item) ? (
          <OpportunityMiniMap
            latitude={item.latitude}
            longitude={item.longitude}
            title={item.title}
            className="h-[150px] w-full"
          />
        ) : (
          <div className="flex h-[150px] items-center justify-center px-4 text-center text-xs text-[#9ec4eb]">
            Location map unavailable for this opportunity. Exact coordinates were not provided.
          </div>
        )}
      </div>

      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex rounded-full bg-[linear-gradient(135deg,#2ed3ff,#2f6fd1)] px-4 py-2 text-xs font-medium text-white transition-all hover:scale-[1.02]"
      >
        View opportunity
      </a>
    </article>
  )
}

export default function SummitPage() {
  const { user, token, loading: authLoading, login, updatePreferences } = useAuth()
  const router = useRouter()

  const [query, setQuery] = useState("")
  const [cause, setCause] = useState("")
  const [geography, setGeography] = useState<(typeof GEOGRAPHY_OPTIONS)[number]["value"]>("all")
  const [selectedInterestFilters, setSelectedInterestFilters] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("discover")

  const [profileInterests, setProfileInterests] = useState<string[]>([])
  const [profileSkills, setProfileSkills] = useState("")
  const [customInterest, setCustomInterest] = useState("")
  const [radiusKm, setRadiusKm] = useState(25)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

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

  useEffect(() => {
    if (!authLoading && user && user.preferences === null) {
      setActiveTab("profile")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user?.preferences) {
      const p = user.preferences
      setProfileInterests(p.interests)
      setProfileSkills(p.skills.join(", "))
      setRadiusKm(p.radius_km)
      if (p.location_lat != null && p.location_lng != null) {
        setUserCoords({ lat: p.location_lat, lng: p.location_lng })
      }
    }
  }, [user])

  const availableInterestFilters = useMemo(() => {
    const savedInterests = user?.preferences?.interests ?? []
    return Array.from(new Set([...INTEREST_SUGGESTIONS, ...savedInterests, ...profileInterests].map(normalizeTag).filter(Boolean)))
  }, [profileInterests, user])

  const effectiveInterestFilters = useMemo(() => {
    const explicitFilters = selectedInterestFilters.map(normalizeTag).filter(Boolean)
    if (explicitFilters.length > 0) {
      return explicitFilters
    }
    return profileInterests.map(normalizeTag).filter(Boolean)
  }, [profileInterests, selectedInterestFilters])

  const filteredItems = useMemo(() => {
    let result = items.filter((item) => matchesSearchQuery(item, query))

    if (cause) {
      result = result.filter((item) => normalizeTag(item.cause) === normalizeTag(cause))
    }

    result = result.filter((item) => matchesInterestFilters(item, effectiveInterestFilters))

    if (geography === "remote") {
      result = result.filter((item) => /remote|virtual|online/i.test(`${item.description} ${item.location}`))
    }

    if (geography === "map-ready") {
      result = result.filter((item) => hasCoordinates(item))
    }

    if (geography === "nearby" && userCoords) {
      result = result.filter(
        (item) => hasCoordinates(item) && haversineKm(userCoords.lat, userCoords.lng, item.latitude, item.longitude) <= radiusKm,
      )
    }

    if (userCoords) {
      result = [...result].sort((a, b) => {
        const dA = hasCoordinates(a) ? haversineKm(userCoords.lat, userCoords.lng, a.latitude, a.longitude) : Number.POSITIVE_INFINITY
        const dB = hasCoordinates(b) ? haversineKm(userCoords.lat, userCoords.lng, b.latitude, b.longitude) : Number.POSITIVE_INFINITY
        return dA - dB
      })
    }
    return result
  }, [cause, effectiveInterestFilters, geography, items, query, radiusKm, userCoords])

  const nearbyEnabled = geography === "nearby"

  const visibleItems = useMemo(() => filteredItems.slice(0, LIST_OPPORTUNITY_LIMIT), [filteredItems])

  async function discoverOpportunities() {
    setLoading(true)
    setIsAiResult(false)
    setError(null)
    try {
      const url = new URL(`${API_BASE}/v1/opportunities`)
      url.searchParams.set("limit", String(DISCOVER_FETCH_LIMIT))
      if (nearbyEnabled && userCoords) {
        url.searchParams.set("lat", String(userCoords.lat))
        url.searchParams.set("lng", String(userCoords.lng))
        url.searchParams.set("radius_km", String(radiusKm))
      }

      const response = await fetch(url.toString())
      if (!response.ok) throw new Error(`Backend returned ${response.status}`)
      const data: V1ListResponse = await response.json()
      setItems(data.items.map((r) => mapOpportunityRead(r)))
      setSource("Summit v1")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  async function saveRecommendationProfile() {
    if (!user) {
      await login({ email: "", password: "" })
      return
    }

    setSavingProfile(true)
    setProfileSaved(false)
    const prefs: UserPreferences = {
      interests: profileInterests.map(normalizeTag),
      skills: parseTags(profileSkills),
      location_lat: userCoords?.lat ?? null,
      location_lng: userCoords?.lng ?? null,
      radius_km: radiusKm,
    }

    try {
      await updatePreferences(prefs)
      setProfileSaved(true)
      if (selectedInterestFilters.length === 0 && prefs.interests.length > 0) {
        setSelectedInterestFilters(prefs.interests.slice(0, 3))
      }
      window.setTimeout(() => {
        window.location.reload()
      }, 350)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save recommendation profile")
    } finally {
      setSavingProfile(false)
    }
  }

  function addCustomInterest() {
    const value = normalizeTag(customInterest)
    if (!value) return
    setProfileInterests((current) => (current.includes(value) ? current : [...current, value]))
    setCustomInterest("")
  }

  function resetFilters() {
    setQuery("")
    setCause("")
    setGeography("all")
    setSelectedInterestFilters([])
    void discoverOpportunities()
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
        mapOpportunityRead(item.opportunity, Math.round(item.score * 100), item.reason ?? ""),
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_8%,rgba(26,124,235,0.2),transparent_34%),radial-gradient(circle_at_88%_78%,rgba(0,205,178,0.14),transparent_32%),linear-gradient(180deg,#07162a_0%,#081b33_45%,#061120_100%)] text-[#d9ebff]">
      <Header />

      {activeTab !== "profile" && (
        <SearchHeaderSection
          loading={loading}
          isAiResult={isAiResult}
          query={query}
          setQuery={setQuery}
          cause={cause}
          setCause={setCause}
          geography={geography}
          setGeography={setGeography}
          startWatchingLocation={startWatchingLocation}
          userCoords={userCoords}
          availableInterestFilters={availableInterestFilters}
          selectedInterestFilters={selectedInterestFilters}
          setSelectedInterestFilters={setSelectedInterestFilters}
          discoverOpportunities={discoverOpportunities}
          source={source}
          error={error}
        />
      )}

      <section className="mx-auto mt-4 w-full max-w-[1680px] px-4 pb-16 md:px-6 xl:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
          <TabsList className="h-auto rounded-full border border-[#315781] bg-[#0c2a49] p-1">
            <TabsTrigger value="discover" className="rounded-full px-4 py-2 text-[#c0dbf5] data-[state=active]:bg-[#1d4f7f] data-[state=active]:text-white">
              Discover
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-full px-4 py-2 text-[#c0dbf5] data-[state=active]:bg-[#1d4f7f] data-[state=active]:text-white">
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4">
            <LocalImpactMapCard
              filteredItems={filteredItems}
              userCoords={userCoords}
              startWatchingLocation={startWatchingLocation}
            />

            <div className="rounded-2xl border border-[#315781] bg-[linear-gradient(145deg,rgba(13,42,72,0.98),rgba(9,29,53,0.95))] p-4">
              <h2 className="text-lg font-semibold text-[#e7f2ff]">
                {isAiResult ? "AI-Matched opportunities" : "Opportunities"}
              </h2>
              <p className="mt-1 text-sm text-[#8bb3dc]">
                {isAiResult
                  ? "Ranked by AI based on your interests, skills, and location."
                  : "High-need local work and discovered listings from the open web."}
              </p>
              {filteredItems.length > LIST_OPPORTUNITY_LIMIT && (
                <p className="mt-2 text-xs text-[#9ec4eb]">
                  Showing {LIST_OPPORTUNITY_LIMIT} cards below. The map still includes up to {Math.min(filteredItems.length, MAP_OPPORTUNITY_LIMIT)} opportunities.
                </p>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {loading && items.length === 0 ? (
                  <>{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</>
                ) : filteredItems.length === 0 ? (
                  <EmptyState isError={!!error} onRetry={resetFilters} />
                ) : visibleItems.map((item) => <OpportunityCard key={item.id} item={item} isAiResult={isAiResult} />)}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <div className="mx-auto max-w-[880px]">
              <RecommendationProfileCard
                profileInterests={profileInterests}
                setProfileInterests={setProfileInterests}
                customInterest={customInterest}
                setCustomInterest={setCustomInterest}
                addCustomInterest={addCustomInterest}
                profileSkills={profileSkills}
                setProfileSkills={setProfileSkills}
                startWatchingLocation={startWatchingLocation}
                userCoords={userCoords}
                saveRecommendationProfile={saveRecommendationProfile}
                savingProfile={savingProfile}
                user={user}
                profileSaved={profileSaved}
              />
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  )
}
