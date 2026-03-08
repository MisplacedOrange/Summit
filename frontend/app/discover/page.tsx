"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Header } from "@/components/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth, type UserPreferences } from "../auth-context"
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

function normalizeTag(value: string): string {
  return value.trim().toLowerCase()
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
  const haystack = [item.title, item.description, item.cause, item.location, ...item.skills]
    .join(" ")
    .toLowerCase()
  return filters.some((filter) => haystack.includes(filter))
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

function SearchHeaderSection({
  loading,
  aiMatching,
  isAiResult,
  token,
  query,
  setQuery,
  cause,
  setCause,
  radiusKm,
  setRadiusKm,
  geography,
  setGeography,
  resetFilters,
  startWatchingLocation,
  userCoords,
  availableInterestFilters,
  selectedInterestFilters,
  setSelectedInterestFilters,
  discoverOpportunities,
  runAiMatch,
  source,
  error,
}: {
  loading: boolean
  aiMatching: boolean
  isAiResult: boolean
  token: string | null
  query: string
  setQuery: (value: string) => void
  cause: string
  setCause: (value: string) => void
  radiusKm: number
  setRadiusKm: (value: number) => void
  geography: (typeof GEOGRAPHY_OPTIONS)[number]["value"]
  setGeography: (value: (typeof GEOGRAPHY_OPTIONS)[number]["value"]) => void
  resetFilters: () => void
  startWatchingLocation: () => void
  userCoords: { lat: number; lng: number } | null
  availableInterestFilters: string[]
  selectedInterestFilters: string[]
  setSelectedInterestFilters: React.Dispatch<React.SetStateAction<string[]>>
  discoverOpportunities: () => Promise<void>
  runAiMatch: () => Promise<void>
  source: string
  error: string | null
}) {
  const geographyLabel = GEOGRAPHY_OPTIONS.find((option) => option.value === geography)?.label ?? "All places"

  return (
    <section className="sticky top-16 z-[60] border-y border-[#cfe1f7]/70 bg-[#eef6ff]/70 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1680px] px-4 py-3 md:px-6 xl:px-8">
        <div className="rounded-[28px] border border-[#b9d5f7]/70 bg-white/50 px-3 py-3 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="relative min-w-[320px] flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#4676aa]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </span>
              <input
                type="search"
                className="h-11 w-full rounded-full border border-[#9ec4ef]/70 bg-white/85 px-11 pr-16 text-sm text-[#143d73] outline-none transition-all placeholder:text-[#6b8db4] focus:border-[#2f6fd1] focus:ring-2 focus:ring-[#2f6fd1]/15"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search opportunities"
                aria-label="Search opportunities"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-xs font-medium text-[#4676aa] transition-colors hover:text-[#143d73]"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </div>

            <details className="group relative shrink-0">
              <summary className="list-none cursor-pointer rounded-full border border-[#b9d5f7]/80 bg-white/40 px-4 py-2 text-sm font-medium text-[#143d73] backdrop-blur-sm transition-colors hover:bg-white/60">
                Cause{cause ? `: ${toLabel(cause)}` : ""}
              </summary>
              <div className="absolute left-0 top-[calc(100%+10px)] z-[80] w-56 rounded-2xl border border-[#b9d5f7]/80 bg-white/95 p-3 shadow-xl backdrop-blur-xl">
                <select
                  className="w-full rounded-xl border border-[#d9e8fb] bg-white px-3 py-2 text-sm text-[#143d73] outline-none"
                  value={cause}
                  onChange={(e) => setCause(e.target.value)}
                >
                  {CAUSE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            </details>

            <details className="group relative shrink-0">
              <summary className="list-none cursor-pointer rounded-full border border-[#b9d5f7]/80 bg-white/40 px-4 py-2 text-sm font-medium text-[#143d73] backdrop-blur-sm transition-colors hover:bg-white/60">
                Location: {geographyLabel}
              </summary>
              <div className="absolute left-0 top-[calc(100%+10px)] z-[80] w-64 rounded-2xl border border-[#b9d5f7]/80 bg-white/95 p-3 shadow-xl backdrop-blur-xl">
                <div className="grid gap-2">
                  {GEOGRAPHY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setGeography(option.value)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        geography === option.value
                          ? "border-[#2f6fd1]/60 bg-[#2f6fd1]/10 text-[#143d73]"
                          : "border-[#d9e8fb] bg-white text-[#4676aa] hover:bg-[#f5faff]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={startWatchingLocation}
                  className="mt-3 w-full rounded-xl border border-[#d9e8fb] bg-[#f7fbff] px-3 py-2 text-sm font-medium text-[#2f6fd1] transition-colors hover:bg-[#edf7ff]"
                >
                  {userCoords ? "Refresh live location" : "Use live location"}
                </button>
              </div>
            </details>

            <details className="group relative shrink-0">
              <summary className="list-none cursor-pointer rounded-full border border-[#b9d5f7]/80 bg-white/40 px-4 py-2 text-sm font-medium text-[#143d73] backdrop-blur-sm transition-colors hover:bg-white/60">
                Themes{selectedInterestFilters.length ? `: ${selectedInterestFilters.length}` : ""}
              </summary>
              <div className="absolute left-0 top-[calc(100%+10px)] z-[80] w-[320px] rounded-2xl border border-[#b9d5f7]/80 bg-white/95 p-3 shadow-xl backdrop-blur-xl">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#6b8db4]">Themes</p>
                  <button
                    type="button"
                    onClick={() => setSelectedInterestFilters([])}
                    className="text-xs font-medium text-[#4676aa] hover:text-[#143d73]"
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
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        selectedInterestFilters.includes(interest)
                          ? "border-emerald-500/70 bg-emerald-100/40 text-emerald-700"
                          : "border-[#d9e8fb] bg-white text-[#4676aa] hover:bg-[#f5faff]"
                      }`}
                    >
                      {toLabel(interest)}
                    </button>
                  ))}
                </div>
              </div>
            </details>

            <details className="group relative shrink-0">
              <summary className="list-none cursor-pointer rounded-full border border-[#b9d5f7]/80 bg-white/40 px-4 py-2 text-sm font-medium text-[#143d73] backdrop-blur-sm transition-colors hover:bg-white/60">
                Radius: {radiusKm} km
              </summary>
              <div className="absolute right-0 top-[calc(100%+10px)] z-[80] w-72 rounded-2xl border border-[#b9d5f7]/80 bg-white/95 p-4 shadow-xl backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 text-sm text-[#4676aa]">
                  <span>Nearby distance</span>
                  <span className="font-semibold text-[#143d73]">{radiusKm} km</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="mt-4 w-full accent-[#2f6fd1]"
                />
              </div>
            </details>

            <button
              type="button"
              onClick={resetFilters}
              className="shrink-0 rounded-full border border-[#b9d5f7]/80 bg-white/30 px-4 py-2 text-sm font-medium text-[#4676aa] transition-colors hover:bg-white/55 hover:text-[#143d73]"
            >
              Reset
            </button>
            <button
              onClick={() => void discoverOpportunities()}
              className="shrink-0 rounded-full border border-[#2f6fd1]/30 bg-[#2f6fd1]/8 px-4 py-2 text-sm font-medium text-[#143d73] transition-colors hover:bg-[#2f6fd1]/14"
              disabled={loading}
            >
              {loading && !aiMatching ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={() => void runAiMatch()}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                aiMatching
                  ? "border border-purple-400/70 bg-purple-100/30 text-purple-700"
                  : isAiResult
                    ? "border border-purple-300/70 bg-purple-100/25 text-purple-700"
                    : "border border-[#9ec4ef]/80 bg-white/30 text-[#143d73] hover:bg-white/55"
              }`}
              disabled={loading || !token}
              title={!token ? "Sign in to use AI matching" : undefined}
            >
              {aiMatching ? "Matching..." : "AI"}
            </button>
          </div>

          {source && (
            <p className="mt-3 px-1 text-xs text-[#4676aa]">
              {isAiResult && (
                <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l2.09 6.26L20.18 9l-5 4.27L16.82 20 12 16.9 7.18 20l1.64-6.73L3.82 9l6.09-.74Z" />
                  </svg>
                  AI Ranked
                </span>
              )}
              Source: {source}
              {userCoords ? ` • Live: ${userCoords.lat.toFixed(2)}, ${userCoords.lng.toFixed(2)}` : ""}
            </p>
          )}
          {error && <p className="mt-2 px-1 text-sm text-red-700">Could not fetch opportunities: {error}</p>}
        </div>
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
    <div className="rounded-2xl border border-[#b9d5f7] bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Recommendation profile</h2>
      <p className="mt-1 text-sm text-[#4676aa]">Keep your saved interests separate from search filters so recommendation tuning has its own space.</p>

      <div className="mt-4 grid gap-4">
        <div>
          <label className="text-sm font-medium text-[#143d73]">Interest areas</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTEREST_SUGGESTIONS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => setProfileInterests((current) => toggleTag(current, interest))}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  profileInterests.includes(interest)
                    ? "border-[#143d73] bg-[#143d73] text-white"
                    : "border-[#b9d5f7] bg-white text-[#2f6fd1] hover:bg-[#edf7ff]"
                }`}
              >
                {toLabel(interest)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_auto]">
          <input
            className="rounded-md border border-[#b9d5f7] px-3 py-2 text-sm"
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
            className="rounded-md border border-[#b9d5f7] px-4 py-2 text-sm font-medium text-[#2f6fd1] hover:bg-[#edf7ff]"
          >
            Add interest
          </button>
        </div>

        {profileInterests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profileInterests.map((interest) => (
              <span key={interest} className="inline-flex items-center gap-1 rounded-full bg-[#143d73] px-3 py-1 text-xs font-medium text-white">
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
          <label className="text-sm font-medium text-[#143d73]">Skills you can offer</label>
          <input
            className="mt-1 w-full rounded-md border border-[#b9d5f7] px-3 py-2 text-sm"
            value={profileSkills}
            onChange={(e) => setProfileSkills(e.target.value)}
            placeholder="teaching, event planning, social media, design"
          />
        </div>

        <div className="rounded-xl border border-[#d9e8fb] bg-[#f7fbff] p-3 text-sm text-[#4676aa]">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={startWatchingLocation}
              className="rounded-full border border-[#b9d5f7] bg-white px-3 py-1.5 text-xs font-medium text-[#2f6fd1] hover:bg-[#edf7ff]"
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
            className="rounded-full bg-[#143d73] px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {savingProfile ? "Saving..." : user ? "Save recommendation profile" : "Sign in to save profile"}
          </button>
        </div>

        {profileSaved && (
          <p className="text-sm text-emerald-600">Recommendation profile saved. AI match will use these preferences now.</p>
        )}

        {user?.preferences && user.preferences.interests.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Using your saved preferences. <a href="/profile" className="underline hover:text-emerald-700">Edit full profile</a>
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
  )
}

function OpportunityCard({ item, isAiResult }: { item: Opportunity; isAiResult: boolean }) {
  const causeStyle = CAUSE_COLORS[item.cause] ?? { bg: "bg-gray-100", text: "text-gray-700", dot: "#6b7280" }

  return (
    <article className="rounded-xl border border-[#b9d5f7] p-4 transition-shadow duration-200 hover:shadow-md">
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
      {isAiResult && item.match_reason && <p className="mt-1.5 text-xs italic text-purple-600">{item.match_reason}</p>}
      <p className="mt-2 line-clamp-3 text-sm text-[#4676aa]">{item.description}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6B645E]">
        <span className="rounded-full bg-[#F3ECE5] px-2 py-1">{item.location}</span>
        <span className="rounded-full bg-[#F3ECE5] px-2 py-1">{item.schedule}</span>
        <span className="rounded-full bg-[#F3ECE5] px-2 py-1">Need: {item.volunteers_needed}</span>
        {isAiResult && item.match_pct > 0 && <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-700">{item.match_pct}%</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {item.skills.slice(0, 4).map((skill) => (
          <span key={skill} className="rounded-full border border-[#D9D1CA] px-2 py-1 text-[11px]">
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[#d9e8fb] bg-[#f7fbff]">
        {hasCoordinates(item) ? (
          <OpportunityMiniMap
            latitude={item.latitude}
            longitude={item.longitude}
            title={item.title}
            className="h-[150px] w-full"
          />
        ) : (
          <div className="flex h-[150px] items-center justify-center px-4 text-center text-xs text-[#6C645F]">
            Location map unavailable for this opportunity. Exact coordinates were not provided.
          </div>
        )}
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
}


export default function ImpactMatchPage() {
  const { user, token, loading: authLoading, login, updatePreferences } = useAuth()
  const router = useRouter()

  const [query, setQuery] = useState("student volunteer opportunities Toronto")
  const [cause, setCause] = useState("")
  const [geography, setGeography] = useState<(typeof GEOGRAPHY_OPTIONS)[number]["value"]>("all")
  const [selectedInterestFilters, setSelectedInterestFilters] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("filters")

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

  const filteredItems = useMemo(() => {
    let result = items.filter((item) => matchesInterestFilters(item, selectedInterestFilters))

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
  }, [geography, items, radiusKm, selectedInterestFilters, userCoords])

  const nearbyEnabled = geography === "nearby"

  const visibleItems = useMemo(() => filteredItems.slice(0, LIST_OPPORTUNITY_LIMIT), [filteredItems])

  async function discoverOpportunities() {
    setLoading(true)
    setIsAiResult(false)
    setError(null)
    try {
      const url = new URL(`${API_BASE}/v1/opportunities`)
      url.searchParams.set("q", query)
      url.searchParams.set("limit", String(LIST_OPPORTUNITY_LIMIT))
      if (cause) url.searchParams.set("category", cause)
      if (nearbyEnabled && userCoords) {
        url.searchParams.set("lat", String(userCoords.lat))
        url.searchParams.set("lng", String(userCoords.lng))
        url.searchParams.set("radius_km", String(radiusKm))
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
      window.setTimeout(() => setProfileSaved(false), 3000)
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

      <SearchHeaderSection
        loading={loading}
        aiMatching={aiMatching}
        isAiResult={isAiResult}
        token={token}
        query={query}
        setQuery={setQuery}
        cause={cause}
        setCause={setCause}
        radiusKm={radiusKm}
        setRadiusKm={setRadiusKm}
        geography={geography}
        setGeography={setGeography}
        resetFilters={resetFilters}
        startWatchingLocation={startWatchingLocation}
        userCoords={userCoords}
        availableInterestFilters={availableInterestFilters}
        selectedInterestFilters={selectedInterestFilters}
        setSelectedInterestFilters={setSelectedInterestFilters}
        discoverOpportunities={discoverOpportunities}
        runAiMatch={runAiMatch}
        source={source}
        error={error}
      />

      <section className="mx-auto mt-4 w-full max-w-[1680px] px-4 pb-16 md:px-6 xl:px-8">
        <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
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

          <LocalImpactMapCard
            filteredItems={filteredItems}
            userCoords={userCoords}
            startWatchingLocation={startWatchingLocation}
          />
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
              <EmptyState isError={!!error} onRetry={resetFilters} />
            ) : visibleItems.map((item) => <OpportunityCard key={item.id} item={item} isAiResult={isAiResult} />)}
          </div>
        </div>
      </section>
    </main>
  )
}
