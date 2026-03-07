"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
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
    }
  }, [user])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F5F3]">
        <p className="text-sm text-[#605A57]">Loading…</p>
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
      location_lat: null,
      location_lng: null,
      radius_km: radiusKm,
    }
    try {
      await updatePreferences(prefs)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert("Failed to save preferences")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F5F3] text-[#37322F]">
      <nav className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-4 md:px-6">
        <a href="/discover" className="text-sm font-semibold">
          ← Back to discover
        </a>
        <button
          onClick={() => { logout(); router.push("/discover") }}
          className="rounded-full border border-[#CFC7C1] bg-white px-4 py-1.5 text-sm font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
        >
          Sign out
        </button>
      </nav>

      <section className="mx-auto max-w-[600px] px-4 pb-16 md:px-6">
        <div className="rounded-2xl border border-[#E5E1DD] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#37322F] text-lg font-bold text-white">
              {user.full_name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{user.full_name ?? "User"}</h1>
              <p className="text-sm text-[#605A57]">{user.email}</p>
            </div>
          </div>

          <hr className="my-6 border-[#E5E1DD]" />

          <h2 className="text-base font-semibold">Matching preferences</h2>
          <p className="mt-1 text-sm text-[#605A57]">
            These are used by AI Match to rank opportunities for you.
          </p>

          <div className="mt-5 grid gap-4">
            <div>
              <label className="block text-sm font-medium">Interests</label>
              <input
                className="mt-1 w-full rounded-md border border-[#D9D2CC] px-3 py-2 text-sm"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. environment, education, healthcare"
              />
              <p className="mt-1 text-xs text-[#7D756F]">Comma-separated topics you care about</p>
            </div>

            <div>
              <label className="block text-sm font-medium">Skills</label>
              <input
                className="mt-1 w-full rounded-md border border-[#D9D2CC] px-3 py-2 text-sm"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. teaching, social media, design"
              />
              <p className="mt-1 text-xs text-[#7D756F]">Comma-separated skills you can offer</p>
            </div>

            <div>
              <label className="block text-sm font-medium">Search radius</label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-16 text-right text-sm font-medium">{radiusKm} km</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-full bg-[#37322F] px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save preferences"}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Saved! AI Match will use these.
              </span>
            )}
          </div>
        </div>

        {user.preferences && (
          <div className="mt-4 rounded-2xl border border-[#E5E1DD] bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold">Current saved profile</h2>
            <div className="mt-3 grid gap-2 text-sm text-[#605A57]">
              <p>
                <span className="font-medium text-[#37322F]">Interests:</span>{" "}
                {user.preferences.interests.length > 0 ? user.preferences.interests.join(", ") : "None set"}
              </p>
              <p>
                <span className="font-medium text-[#37322F]">Skills:</span>{" "}
                {user.preferences.skills.length > 0 ? user.preferences.skills.join(", ") : "None set"}
              </p>
              <p>
                <span className="font-medium text-[#37322F]">Radius:</span>{" "}
                {user.preferences.radius_km} km
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
