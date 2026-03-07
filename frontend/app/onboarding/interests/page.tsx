"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "../../auth-context"
import type { UserPreferences } from "../../auth-context"

const PRESET_CATEGORIES = [
  "Environment",
  "Education",
  "Healthcare",
  "Community",
  "Animal Care",
  "Arts & Culture",
]

export default function OnboardingInterestsPage() {
  const { user, loading, updatePreferences } = useAuth()
  const router = useRouter()

  const [selected, setSelected] = useState<string[]>([])
  const [input, setInput] = useState("")
  const [saving, setSaving] = useState(false)

  // Auth guard — redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F5F3]">
        <p className="text-sm text-[#605A57]">Loading…</p>
      </main>
    )
  }

  if (!user) return null

  function toggle(cat: string) {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    )
  }

  function addCustom() {
    const val = input.trim()
    if (val && !selected.includes(val)) {
      setSelected((prev) => [...prev, val])
    }
    setInput("")
  }

  async function handleSave() {
    setSaving(true)
    const prefs: UserPreferences = {
      interests: selected.map((s) => s.toLowerCase()),
      skills: [],
      location_lat: null,
      location_lng: null,
      radius_km: 25,
    }
    try {
      await updatePreferences(prefs)
      router.push("/discover")
    } catch {
      alert("Failed to save — please try again")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F5F3] flex items-center justify-center px-4">
      <div className="max-w-[520px] w-full rounded-2xl border border-[#E5E1DD] bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6">
          <p className="inline-flex rounded-full border border-[#E5E1DD] bg-[#F7F5F3] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#605A57]">
            Summit · Step 1 of 1
          </p>
          <h1 className="mt-4 text-2xl font-semibold text-[#37322F]">
            What are you passionate about?
          </h1>
          <p className="mt-2 text-sm text-[#605A57]">
            Select causes you care about to personalize your AI-powered volunteer recommendations.
          </p>
        </div>

        {/* Preset category chips */}
        <div className="flex flex-wrap gap-2">
          {PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                selected.includes(cat)
                  ? "bg-[#37322F] text-white border-[#37322F]"
                  : "bg-white text-[#37322F] border-[#CFC7C1] hover:border-[#37322F]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Custom freetext tag input */}
        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-md border border-[#D9D2CC] px-3 py-2 text-sm outline-none transition focus:border-[#37322F]"
            placeholder="Add a custom interest…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addCustom()
              }
            }}
          />
          <button
            type="button"
            onClick={addCustom}
            className="rounded-md border border-[#D9D2CC] px-4 py-2 text-sm font-medium hover:bg-[#F3ECE5] transition-colors"
          >
            Add
          </button>
        </div>

        {/* Selected custom tags (non-preset) */}
        {selected.filter((s) => !PRESET_CATEGORIES.includes(s)).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selected
              .filter((s) => !PRESET_CATEGORIES.includes(s))
              .map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-[#37322F] px-3 py-1 text-xs font-medium text-white"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => toggle(tag)}
                    className="ml-0.5 opacity-70 hover:opacity-100"
                    aria-label={`Remove ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
          </div>
        )}

        <hr className="my-6 border-[#E5E1DD]" />

        {/* Footer actions */}
        <div className="flex items-center justify-between">
          <a
            href="/discover"
            className="text-sm text-[#7D756F] hover:underline"
          >
            Skip for now →
          </a>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={selected.length === 0 || saving}
            className="rounded-full bg-[#37322F] px-6 py-2 text-sm font-medium text-white disabled:opacity-40 transition-opacity"
          >
            {saving ? "Saving…" : "Save & discover"}
          </button>
        </div>
      </div>
    </main>
  )
}
