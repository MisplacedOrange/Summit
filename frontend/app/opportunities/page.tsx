"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { supabase } from "@/lib/supabase"

type Opportunity = {
  id: string
  title: string
  description: string
  cause_category: string | null
  location_text: string | null
  location_lat: number | null
  location_lng: number | null
  event_date: string | null
  event_time: string | null
  volunteers_needed: number | null
  volunteers_signed: number
  skills_required: string[]
  source_url: string | null
  image_url: string | null
  is_scraped: boolean
  created_at: string | null
}

const CAUSE_COLORS: Record<string, { bg: string; text: string }> = {
  environment: { bg: "bg-emerald-100", text: "text-emerald-700" },
  education: { bg: "bg-blue-100", text: "text-blue-700" },
  healthcare: { bg: "bg-red-100", text: "text-red-700" },
  community: { bg: "bg-yellow-100", text: "text-yellow-700" },
  "animal-care": { bg: "bg-purple-100", text: "text-purple-700" },
  "arts-culture": { bg: "bg-pink-100", text: "text-pink-700" },
}

function toLabel(value: string): string {
  if (!value) return "General"
  return value.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
}

function urgencyFromNeeded(n: number): "low" | "medium" | "high" {
  return n > 10 ? "high" : n > 5 ? "medium" : "low"
}

const URGENCY_STYLE: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-gray-100", text: "text-gray-600" },
  medium: { bg: "bg-amber-100", text: "text-amber-700" },
  high: { bg: "bg-red-100", text: "text-red-700" },
}

const PAGE_SIZE = 24

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [causeFilter, setCauseFilter] = useState("")
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function fetchOpportunities() {
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from("opportunities")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (search.trim()) {
          query = query.or(
            `title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`
          )
        }
        if (causeFilter) {
          query = query.eq("cause_category", causeFilter)
        }

        const { data, error: sbError, count } = await query

        if (sbError) throw new Error(sbError.message)
        setItems((data as Opportunity[]) ?? [])
        setTotal(count ?? 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load opportunities")
      } finally {
        setLoading(false)
      }
    }

    void fetchOpportunities()
  }, [search, causeFilter, page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="min-h-screen bg-[#eef6ff] text-[#143d73]">
      <Header />

      <section className="mx-auto max-w-[1100px] px-4 pb-6 pt-24 md:px-6">
        <h1 className="text-2xl font-semibold sm:text-3xl">All Opportunities</h1>
        <p className="mt-1 text-sm text-[#4676aa]">
          Browse {total > 0 ? total.toLocaleString() : ""} volunteer opportunities sourced from our database.
        </p>

        {/* Filters */}
        <div className="mt-5 flex flex-wrap gap-3">
          <input
            className="w-full max-w-sm rounded-md border border-[#b9d5f7] bg-white px-3 py-2 text-sm placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#2f6fd1]/30"
            placeholder="Search by title or description…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
          <select
            className="rounded-md border border-[#b9d5f7] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f6fd1]/30"
            value={causeFilter}
            onChange={(e) => {
              setCauseFilter(e.target.value)
              setPage(0)
            }}
          >
            <option value="">All causes</option>
            <option value="environment">Environment</option>
            <option value="education">Education</option>
            <option value="healthcare">Healthcare</option>
            <option value="community">Community</option>
            <option value="animal-care">Animal Care</option>
            <option value="arts-culture">Arts &amp; Culture</option>
          </select>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-4 pb-16 md:px-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-[#b9d5f7] bg-white p-5">
                <div className="h-5 w-3/5 rounded bg-[#b9d5f7]" />
                <div className="mt-2 h-4 w-2/5 rounded bg-[#EDE9E4]" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-full rounded bg-[#EDE9E4]" />
                  <div className="h-3 w-4/5 rounded bg-[#EDE9E4]" />
                </div>
                <div className="mt-4 h-8 w-28 rounded-full bg-[#b9d5f7]" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="h-16 w-16 text-[#9ec4ef]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold">No opportunities found</h3>
            <p className="mt-1 max-w-sm text-sm text-[#4676aa]">
              Try broadening your search or removing filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const cause = (item.cause_category ?? "").toLowerCase()
                const causeStyle = CAUSE_COLORS[cause] ?? { bg: "bg-gray-100", text: "text-gray-700" }
                const needed = item.volunteers_needed ?? 1
                const urgency = urgencyFromNeeded(needed)
                const urgencyStyle = URGENCY_STYLE[urgency]

                return (
                  <article
                    key={item.id}
                    className="flex flex-col rounded-xl border border-[#b9d5f7] bg-white p-5 transition-shadow duration-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold leading-tight line-clamp-2">{item.title}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${causeStyle.bg} ${causeStyle.text}`}>
                        {toLabel(cause)}
                      </span>
                    </div>

                    {item.location_text && (
                      <p className="mt-1.5 text-xs text-[#6C645F]">{item.location_text}</p>
                    )}

                    <p className="mt-2 line-clamp-3 text-sm text-[#4676aa]">{item.description}</p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${urgencyStyle.bg} ${urgencyStyle.text}`}>
                        {urgency} urgency
                      </span>
                      <span className="rounded-full bg-[#F3ECE5] px-2 py-0.5 text-[#6C645F]">
                        {needed} volunteer{needed !== 1 ? "s" : ""} needed
                      </span>
                      {item.event_date && (
                        <span className="rounded-full bg-[#F3ECE5] px-2 py-0.5 text-[#6C645F]">
                          {new Date(item.event_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {item.skills_required?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.skills_required.slice(0, 4).map((skill) => (
                          <span key={skill} className="rounded-full border border-[#D9D1CA] px-2 py-0.5 text-[11px]">
                            {skill}
                          </span>
                        ))}
                        {item.skills_required.length > 4 && (
                          <span className="text-[11px] text-[#999]">+{item.skills_required.length - 4} more</span>
                        )}
                      </div>
                    )}

                    <div className="mt-auto pt-4">
                      {item.source_url ? (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-full bg-[#2f6fd1] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#245cb0]"
                        >
                          View opportunity
                        </a>
                      ) : (
                        <Link
                          href={`/discover`}
                          className="inline-flex rounded-full border border-[#9ec4ef] bg-white px-4 py-2 text-xs font-medium text-[#2f6fd1] hover:bg-[#eaf4ff] transition-colors"
                        >
                          Learn more
                        </Link>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-full border border-[#9ec4ef] bg-white px-4 py-2 text-sm font-medium text-[#2f6fd1] transition-colors hover:bg-[#eaf4ff] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-[#4676aa]">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-full border border-[#9ec4ef] bg-white px-4 py-2 text-sm font-medium text-[#2f6fd1] transition-colors hover:bg-[#eaf4ff] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}
