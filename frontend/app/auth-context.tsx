"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type React from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000"

export type UserPreferences = {
  interests: string[]
  skills: string[]
  location_lat: number | null
  location_lng: number | null
  radius_km: number
}

export type AuthUser = {
  id: string
  email: string
  full_name: string | null
  role: string
  preferences: UserPreferences | null
  picture?: string | null
}

type LoginInput = {
  email: string
  password: string
}

type Auth0SessionUser = {
  sub: string
  email: string
  name?: string | null
  picture?: string | null
  role?: "student" | "organization"
}

type Auth0SessionResponse = {
  user: Auth0SessionUser | null
  accessToken?: string | null
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (input: LoginInput) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
  updatePreferences: (prefs: UserPreferences) => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  refreshProfile: async () => {},
  updatePreferences: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadProfileFromToken(accessToken: string, picture?: string | null) {
      const profileRes = await fetch(`${API_BASE}/v1/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!profileRes.ok) {
        throw new Error("Failed to fetch profile")
      }
      const profile = (await profileRes.json()) as AuthUser
      if (picture) {
        profile.picture = picture
      }
      return profile
    }

    async function syncAuth0Session() {
      const sessionRes = await fetch("/api/auth/me", { cache: "no-store" })
      if (!sessionRes.ok) {
        return false
      }

      const session = (await sessionRes.json()) as Auth0SessionResponse
      if (!session.user?.sub || !session.user?.email) {
        return false
      }

      const exchangeRes = await fetch(`${API_BASE}/v1/auth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth0_id: session.user.sub,
          email: session.user.email,
          full_name: session.user.name ?? null,
          role: session.user.role ?? "student",
        }),
      })

      if (!exchangeRes.ok) {
        return false
      }

      const exchangeData = await exchangeRes.json().catch(() => ({})) as { access_token?: string }
      if (!exchangeData.access_token) {
        return false
      }

      localStorage.setItem("im_token", exchangeData.access_token)
      setToken(exchangeData.access_token)

      const profile = await loadProfileFromToken(exchangeData.access_token, session.user.picture ?? null)
      if (!cancelled) {
        setUser(profile)
      }
      return true
    }

    async function init() {
      try {
        const synced = await syncAuth0Session()
        if (synced) {
          return
        }
      } catch {
        // fall through to stored token fallback
      }

      const stored = localStorage.getItem("im_token")
      if (stored) {
        try {
          const profile = await loadProfileFromToken(stored)
          if (!cancelled) {
            setUser(profile)
            setToken(stored)
          }
        } catch {
          localStorage.removeItem("im_token")
        }
      }

      if (!cancelled) setLoading(false)
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (_input: LoginInput) => {
    window.location.assign("/api/auth/login?returnTo=/dashboard")
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("im_token")
    setToken(null)
    setUser(null)
    window.location.assign("/api/auth/logout?returnTo=/")
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const profile = await res.json()
        setUser((prev) => prev ? { ...profile, picture: prev.picture } : profile)
      }
    } catch {
      // ignore
    }
  }, [token])

  const updatePreferences = useCallback(
    async (prefs: UserPreferences) => {
      if (!token) return
      const res = await fetch(`${API_BASE}/v1/users/me/preferences`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prefs),
      })
      if (!res.ok) throw new Error("Failed to save preferences")
      const updated = await res.json() as AuthUser
      setUser((prev) => prev ? { ...updated, picture: prev.picture } : updated)
    },
    [token],
  )

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshProfile, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  )
}
