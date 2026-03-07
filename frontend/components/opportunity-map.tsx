"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

const CAUSE_MARKER_COLORS: Record<string, string> = {
  environment: "#059669",
  education: "#2563eb",
  healthcare: "#dc2626",
  community: "#ca8a04",
  "animal-care": "#9333ea",
  "arts-culture": "#ec4899",
  "food security": "#f97316",
}

function markerColor(cause: string): string {
  return CAUSE_MARKER_COLORS[cause] ?? "#6b7280"
}

function createIcon(cause: string, urgency: string) {
  const color = markerColor(cause)
  const size = urgency === "high" ? 14 : urgency === "medium" ? 11 : 9
  const ring = urgency === "high" ? `<circle cx="12" cy="12" r="11" fill="none" stroke="${color}" stroke-width="2" opacity="0.35"/>` : ""
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    ${ring}
    <circle cx="12" cy="12" r="${size / 2}" fill="${color}" stroke="white" stroke-width="2"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  })
}

function createUserIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="13" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="6" fill="#3b82f6" stroke="white" stroke-width="2.5"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

export type MapOpportunity = {
  id: string
  title: string
  organization: string
  cause: string
  location: string
  urgency: string
  latitude: number
  longitude: number
  match_pct?: number
  volunteers_needed?: number
  volunteers_signed?: number
}

export type HeatPoint = {
  lat: number
  lng: number
  weight: number
}

type OpportunityMapProps = {
  items: MapOpportunity[]
  heatPoints?: HeatPoint[]
  className?: string
  userLocation?: { lat: number; lng: number } | null
  onLocateMe?: () => void
  onMarkerClick?: (id: string) => void
}

type MapMode = "markers" | "heat"

export default function OpportunityMap({ items, heatPoints, className, userLocation, onLocateMe, onMarkerClick }: OpportunityMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const heatLayerRef = useRef<L.Layer | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const [mode, setMode] = useState<MapMode>("markers")

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [43.6532, -79.3832],
      zoom: 11,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map)

    markersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = null
      heatLayerRef.current = null
    }
  }, [])

  // Valid items with coordinates
  const validItems = useMemo(
    () => items.filter((i) => i.latitude && i.longitude && isFinite(i.latitude) && isFinite(i.longitude)),
    [items],
  )

  // Compute heat data from heatPoints prop or fall back to items with urgency weighting
  const heatData = useMemo(() => {
    if (heatPoints && heatPoints.length > 0) {
      return heatPoints.map((p) => [p.lat, p.lng, p.weight] as [number, number, number])
    }
    return validItems.map((item) => {
      const needed = item.volunteers_needed ?? 1
      const signed = item.volunteers_signed ?? 0
      const remaining = Math.max(0, needed - signed)
      const weight = Math.min(1.0, 0.2 + (remaining / Math.max(needed, 1)) * 0.8)
      return [item.latitude, item.longitude, weight] as [number, number, number]
    })
  }, [heatPoints, validItems])

  // Update markers when items change
  useEffect(() => {
    const map = mapRef.current
    const group = markersRef.current
    if (!map || !group) return

    group.clearLayers()

    if (mode === "markers") {
      for (const item of validItems) {
        const icon = createIcon(item.cause, item.urgency)
        const matchBadge =
          item.match_pct && item.match_pct > 0
            ? `<span style="display:inline-block;background:#f3e8ff;color:#7c3aed;border-radius:9999px;padding:1px 7px;font-size:11px;font-weight:600;margin-left:6px">${item.match_pct}%</span>`
            : ""

        const popup = `
          <div style="min-width:180px;font-family:system-ui,sans-serif">
            <div style="font-weight:600;font-size:13px;line-height:1.3">${item.title}${matchBadge}</div>
            <div style="color:#6b7280;font-size:12px;margin-top:2px">${item.organization}</div>
            <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap">
              <span style="background:${markerColor(item.cause)}22;color:${markerColor(item.cause)};border-radius:9999px;padding:1px 8px;font-size:11px">${item.cause.replace(/-/g, " ")}</span>
              <span style="background:#f3f4f6;color:#374151;border-radius:9999px;padding:1px 8px;font-size:11px">${item.location}</span>
            </div>
          </div>`

        const marker = L.marker([item.latitude, item.longitude], { icon }).bindPopup(popup)
        if (onMarkerClick) {
          marker.on("click", () => onMarkerClick(item.id))
        }
        group.addLayer(marker)
      }
    }

    // Fit bounds to show all markers + user location
    const allCoords: [number, number][] = validItems.map((i) => [i.latitude, i.longitude] as [number, number])
    if (userLocation) {
      allCoords.push([userLocation.lat, userLocation.lng])
    }
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
    }
  }, [validItems, onMarkerClick, userLocation, mode])

  // Manage heat layer
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove existing heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current)
      heatLayerRef.current = null
    }

    if (mode === "heat" && heatData.length > 0) {
      // Dynamically import leaflet.heat (it attaches L.heatLayer to L)
      import("leaflet.heat").then(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const heatLayer = (L as any).heatLayer(heatData, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          max: 1.0,
          gradient: { 0.2: "#eff6ff", 0.4: "#93c5fd", 0.6: "#3b82f6", 0.8: "#f97316", 1.0: "#dc2626" },
        })
        heatLayer.addTo(map)
        heatLayerRef.current = heatLayer
      })
    }
  }, [mode, heatData])

  // User location marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current)
      userMarkerRef.current = null
    }

    if (userLocation) {
      const marker = L.marker([userLocation.lat, userLocation.lng], { icon: createUserIcon(), zIndexOffset: 1000 })
        .bindPopup('<div style="font-family:system-ui,sans-serif;font-size:13px;font-weight:600">You are here</div>')
        .addTo(map)
      userMarkerRef.current = marker
    }
  }, [userLocation])

  return (
    <div className="relative">
      <div ref={containerRef} className={className ?? "h-[380px] w-full rounded-xl"} />

      {/* Mode toggle */}
      <div className="absolute top-3 left-3 z-[1000] flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md text-xs font-medium">
        <button
          type="button"
          onClick={() => setMode("markers")}
          className={`px-3 py-1.5 transition-colors ${mode === "markers" ? "bg-[#37322F] text-white" : "hover:bg-gray-50"}`}
        >
          Pins
        </button>
        <button
          type="button"
          onClick={() => setMode("heat")}
          className={`px-3 py-1.5 transition-colors ${mode === "heat" ? "bg-[#37322F] text-white" : "hover:bg-gray-50"}`}
        >
          Heatmap
        </button>
      </div>

      {onLocateMe && (
        <button
          type="button"
          onClick={onLocateMe}
          title="Find my location"
          className="absolute top-3 right-3 z-[1000] flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
          </svg>
        </button>
      )}
    </div>
  )
}
