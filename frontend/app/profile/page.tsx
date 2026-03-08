"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useAuth } from "../auth-context"
import type { UserPreferences } from "../auth-context"

export default function ProfilePage() {
  const { user, loading, logout, updatePreferences } = useAuth()
  const router = useRouter()

  const [interests, setInterests] = useState("")
  const [skills, setSkills] = useState("")
  const [radiusKm, setRadiusKm] = useState(25)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle")

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied")
      return
    }
    setLocationStatus("loading")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationStatus("granted")
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [loading, user, router])

  useEffect(() => {
    if (user?.preferences) {
      setInterests(user.preferences.interests.join(", "))
      setSkills(user.preferences.skills.join(", "))
      setRadiusKm(user.preferences.radius_km)
      // Restore saved coordinates if they exist
      if (user.preferences.location_lat != null && user.preferences.location_lng != null) {
        setUserCoords({ lat: user.preferences.location_lat, lng: user.preferences.location_lng })
        setLocationStatus("granted")
      }
    }
  }, [user])

  // Request location on mount
  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef6ff] text-[#143d73]">
        <p className="text-sm">Loading your profile...</p>
      </main>
    )
  }

  if (!user) return null

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const prefs: UserPreferences = {
      interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      location_lat: userCoords?.lat ?? null,
      location_lng: userCoords?.lng ?? null,
      radius_km: radiusKm,
    }
    try {
      await updatePreferences(prefs)
      setSaved(true)
      window.setTimeout(() => {
        window.location.reload()
      }, 350)
    } catch {
      alert("Failed to save preferences")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(47,111,209,0.16),transparent_28%),linear-gradient(180deg,#eef6ff_0%,#e4f0ff_52%,#eef6ff_100%)] text-[#143d73]">
      <nav className="mx-auto flex max-w-[1060px] items-center justify-between px-4 py-4 md:px-6">
        <a href="/discover" className="text-sm font-semibold text-[#245cb0] transition hover:text-[#143d73]">
          ← Back to discover
        </a>
        <button
          onClick={() => { logout(); router.push("/discover") }}
          className="rounded-full border border-[#c2daf8] bg-white px-4 py-1.5 text-sm font-medium text-[#245cb0] transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
        >
          Sign out
        </button>
      </nav>

      <section className="mx-auto max-w-[760px] px-4 pb-16 md:px-6">
        <div className="rounded-[28px] border border-[#c2daf8] bg-[linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] p-6 shadow-[0_18px_60px_rgba(47,111,209,0.14)] md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2f6fd1] text-lg font-bold text-white shadow-[0_10px_28px_rgba(47,111,209,0.25)]">
              {user.full_name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e88bb]">Profile</p>
              <h1 className="text-2xl font-semibold tracking-tight">{user.full_name ?? "User"}</h1>
              <p className="text-sm text-[#4876aa]">{user.email}</p>
            </div>
          </div>

          <hr className="my-6 border-[#d7e6fa]" />

          <h2 className="text-base font-semibold">Matching preferences</h2>
          <p className="mt-1 text-sm text-[#4876aa]">
            These are used by AI Match to rank opportunities for you.
          </p>

          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl border border-[#d7e6fa] bg-[#f7fbff] p-4">
              <label className="block text-sm font-medium text-[#143d73]">Interests</label>
              <input
                className="mt-2 w-full rounded-md border border-[#b6d4f7] bg-white px-3 py-2 text-sm text-[#143d73] outline-none focus:border-[#2f6fd1] focus:ring-2 focus:ring-[#2f6fd1]/15"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. environment, education, healthcare"
              />
              <p className="mt-2 text-xs text-[#5e88bb]">Comma-separated topics you care about</p>
            </div>

            <div className="rounded-2xl border border-[#d7e6fa] bg-[#f7fbff] p-4">
              <label className="block text-sm font-medium text-[#143d73]">Skills</label>
              <input
                className="mt-2 w-full rounded-md border border-[#b6d4f7] bg-white px-3 py-2 text-sm text-[#143d73] outline-none focus:border-[#2f6fd1] focus:ring-2 focus:ring-[#2f6fd1]/15"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. teaching, social media, design"
              />
              <p className="mt-2 text-xs text-[#5e88bb]">Comma-separated skills you can offer</p>
            </div>

            <div className="rounded-2xl border border-[#d7e6fa] bg-[#f7fbff] p-4">
              <label className="block text-sm font-medium text-[#143d73]">Search radius</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-16 text-right text-sm font-medium text-[#245cb0]">{radiusKm} km</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#d7e6fa] bg-[#f7fbff] p-4">
              <label className="block text-sm font-medium text-[#143d73]">Your location</label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {locationStatus === "granted" && userCoords ? (
                  <p className="text-sm text-emerald-600">
                    Location detected ({userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)})
                  </p>
                ) : locationStatus === "loading" ? (
                  <p className="text-sm text-[#4876aa]">Detecting location...</p>
                ) : locationStatus === "denied" ? (
                  <p className="text-sm text-amber-600">Location access denied. Results won&apos;t be ranked by distance.</p>
                ) : null}
                <button
                  type="button"
                  onClick={requestLocation}
                  className="rounded-full border border-[#c2daf8] bg-white px-3 py-1 text-xs font-medium text-[#245cb0] transition hover:bg-[#e8f2ff]"
                >
                  {locationStatus === "granted" ? "Refresh" : "Allow location"}
                </button>
              </div>
              <p className="mt-2 text-xs text-[#5e88bb]">Used for proximity ranking in AI Match</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-full bg-[linear-gradient(135deg,#2f8cff,#2f6fd1)] px-6 py-2 text-sm font-medium text-white shadow-[0_10px_28px_rgba(47,111,209,0.24)] transition hover:brightness-105 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save preferences"}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Saved! Refreshing your profile...
              </span>
            )}
          </div>
        </div>

        {user.preferences && (
          <div className="mt-4 rounded-[28px] border border-[#c2daf8] bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#143d73]">Current saved profile</h2>
            <div className="mt-3 grid gap-2 text-sm text-[#4876aa]">
              <p>
                <span className="font-medium text-[#143d73]">Interests:</span>{" "}
                {user.preferences.interests.length > 0 ? user.preferences.interests.join(", ") : "None set"}
              </p>
              <p>
                <span className="font-medium text-[#143d73]">Skills:</span>{" "}
                {user.preferences.skills.length > 0 ? user.preferences.skills.join(", ") : "None set"}
              </p>
              <p>
                <span className="font-medium text-[#143d73]">Radius:</span>{" "}
                {user.preferences.radius_km} km
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
