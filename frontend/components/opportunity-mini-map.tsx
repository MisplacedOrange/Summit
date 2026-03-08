"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

type OpportunityMiniMapProps = {
  latitude: number
  longitude: number
  title: string
  className?: string
}

function createMiniMarker() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
    <circle cx="11" cy="11" r="9" fill="#2f6fd1" fill-opacity="0.18" stroke="#2f6fd1" stroke-width="1.5"/>
    <circle cx="11" cy="11" r="4.5" fill="#2f6fd1" stroke="white" stroke-width="2"/>
  </svg>`

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

export default function OpportunityMiniMap({ latitude, longitude, title, className }: OpportunityMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      tapHold: false,
    })

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map)

    markerRef.current = L.marker([latitude, longitude], { icon: createMiniMarker() })
      .bindTooltip(title, { direction: "top", offset: [0, -8] })
      .addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [latitude, longitude, title])

  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setView([latitude, longitude], 13)

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude])
      markerRef.current.bindTooltip(title, { direction: "top", offset: [0, -8] })
    }
  }, [latitude, longitude, title])

  return <div ref={containerRef} className={`${className ?? "h-[150px] w-full"} relative isolate z-0`} />
}