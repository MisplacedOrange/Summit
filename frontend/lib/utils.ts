import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---------------------------------------------------------------------------
// v1 API schema types
// ---------------------------------------------------------------------------

export interface V1OpportunityRead {
  id: string
  organization_id: string | null
  title: string
  description: string
  cause_category: string | null
  location_text: string | null
  location_lat: number | null
  location_lng: number | null
  volunteers_needed: number | null
  skills_required: string[]
  source_url: string | null
  event_date: string | null
  event_time: string | null
}

export interface LegacyOpportunity {
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

/**
 * Maps a v1 OpportunityRead from the FastAPI backend into the shape the
 * frontend Discover page and OpportunityMap component expect.
 */
export function mapOpportunityRead(
  v1: V1OpportunityRead,
  matchPct = 0,
): LegacyOpportunity {
  const n = v1.volunteers_needed ?? 0
  const urgency: "low" | "medium" | "high" = n > 10 ? "high" : n > 5 ? "medium" : "low"
  return {
    id: v1.id,
    title: v1.title,
    organization: v1.organization_id ?? "",
    description: v1.description,
    url: v1.source_url ?? "#",
    cause: (v1.cause_category ?? "community").toLowerCase(),
    location: v1.location_text ?? "Location TBD",
    schedule: v1.event_date ?? "Flexible",
    volunteers_needed: n || 1,
    skills: v1.skills_required ?? [],
    urgency,
    match_pct: matchPct,
    match_reason: "",
    latitude: v1.location_lat ?? 0,
    longitude: v1.location_lng ?? 0,
  }
}
