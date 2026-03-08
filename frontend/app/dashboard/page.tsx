"use client"

import { useEffect, useState } from "react"
import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"
import type { V1OpportunityRead } from "@/lib/utils"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000"

function formatDateTime(eventDate: string | null, eventTime: string | null): string {
  if (!eventDate) return "Date TBD"
  const label = new Date(eventDate + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  if (!eventTime) return label
  const [h, m] = eventTime.split(":")
  const d = new Date()
  d.setHours(Number(h), Number(m))
  const time = d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })
  return `${label}, ${time}`
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-md border border-[#b6d4f7] p-4">
      <div className="h-4 w-2/3 rounded bg-[#dbeeff]" />
      <div className="mt-2 h-3 w-1/2 rounded bg-[#dbeeff]" />
      <div className="mt-2 h-3 w-1/3 rounded bg-[#dbeeff]" />
    </div>
  )
}

export default function DashboardPage() {
  const [items, setItems] = useState<V1OpportunityRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOpportunities() {
      try {
        const res = await fetch(`${API_BASE}/v1/opportunities?limit=20`)
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        const data = (await res.json()) as { total: number; items: V1OpportunityRead[] }
        setItems(data.items)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load opportunities")
      } finally {
        setLoading(false)
      }
    }
    void fetchOpportunities()
  }, [])

  return (
    <main className="min-h-screen bg-[#eef6ff] text-[#143d73]">
      <Header />

      <section className="mx-auto max-w-[1060px] px-4 pb-16 pt-24">
        <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-3 text-sm text-[#4676aa]">
          Track volunteer activity, review opportunities, and monitor upcoming events.
        </p>

        <div className="mt-6 rounded-lg border border-[#b6d4f7] bg-white p-6">
          <h2 className="text-xl font-semibold">Volunteer Opportunities</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <>{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-[#4676aa]">No opportunities found.</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-md border border-[#b6d4f7] p-4">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-[#4676aa]">
                    {item.organization_name ?? item.location_text ?? "Unknown organization"}
                  </p>
                  <p className="mt-1 text-sm text-[#4676aa]">
                    {formatDateTime(item.event_date, item.event_time)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
